const {getDb} = require('../lib/database');
const {Telegraf} = require('telegraf');
const moment = require('moment');
const {wait, eventLoopQueue} = require('../lib/helpers');
const {sendStageMessage} = require('../lib/message');
const Profile = require('./Profile');
const Funnel = require('./Funnel');

const STAGEMAILER_CHECK_INTERVAL_SEC = process.env.STAGEMAILER_CHECK_INTERVAL_SEC ? parseInt(process.env.STAGEMAILER_CHECK_INTERVAL_SEC) : 60;
const STAGEMAILER_SECONDS_CHECK_INTERVAL_SEC = process.env.STAGEMAILER_SECONDS_CHECK_INTERVAL_SEC ? parseInt(process.env.STAGEMAILER_SECONDS_CHECK_INTERVAL_SEC) : 10;
const API_ROOT = process.env.TGAPI_ROOT || 'https://api.telegram.org';
const UTC_DAILY_HOUR = process.env.UTC_DAILY_HOUR ? parseInt(process.env.UTC_DAILY_HOUR) : 11;
const DAY_MSEC = 86400 * 1000;
const ROUND_EXACT_TO_MINS = process.env.ROUND_EXACT_TO_MINS ? parseInt(process.env.ROUND_EXACT_TO_MINS) : 5;
const TEST_MODE = process.env.TEST_MODE === '1';

module.exports = class StageMailer {
    constructor() {
        this.bots = [];
        this.dailyLoop = false;
        this.exactLoop = false;
        this.secondsLoop = false;

        if (TEST_MODE) {
            this.nextDailyCheck = moment().unix()+10;
        }
        else {
            this.nextDailyCheck = moment().get('h') < UTC_DAILY_HOUR
                ? moment().startOf('d').set('h', UTC_DAILY_HOUR).unix()
                : moment().add(1, 'd').startOf('d').set('h', UTC_DAILY_HOUR).unix();
        }
    }

    async loadBots() {
        let db = await getDb();
        this.bots = await db.collection('bots').find({}).toArray();
    }

    async getTelegram(botId, reload = false) {
        let botsLoaded = this.bots && this.bots.length > 0;
        let loadBots = reload || !botsLoaded;
        if (loadBots) {
            await this.loadBots();
        }

        let bot = this.bots.find(bot => bot.botId === botId);
        if (!bot && !reload) {
            bot = this.getTelegram(botId, true);
        }

        if (!bot) {
            return false;
        }

        let token = bot.token;
        return new Telegraf(token, {telegram: {apiRoot: API_ROOT}}).telegram;
    }

    async sendStage(stage, profile) {
        let {chatId, userId, botId} = profile.get();
        let telegram = await this.getTelegram(botId);

        if (!telegram) {
            return false;
        }

        let message;
        try {
            message = await sendStageMessage(telegram, chatId, stage, botId);
            await profile.setFunnelStage(stage.funnelId, stage.id);

            let funnel = new Funnel(stage.funnelId);
            await funnel.logStageTimer(stage, userId, chatId);
        }
        catch (sendError) {
            if (sendError && sendError.code) {
                if (sendError.code === 403) {
                    await profile.setBlocked();
                    return false;
                }

                if (sendError.code === 429) {
                    let waitTimeMs = sendError.parameters && sendError.parameters.retry_after
                        ? (sendError.parameters.retry_after || 1) * 1000
                        : 1000;

                    await wait(waitTimeMs);
                    return this.sendStage(stage, profile);
                }

                return false;
            }
        }

        return message;
    }

    async sendStagesToProfiles(profiles, allStages) {
        for (const profileData of profiles) {
            let {funnelId, stageId} = profileData;
            let profileStage = allStages.find( stage => stage.id === stageId && stage.funnelId === funnelId );
            if (!profileStage) {
                continue;
            }

            let profile = new Profile(profileStage.userId, null, profileData);
            await profile.init();

            let nextStage = profileStage.nextStageData[0];
            await this.sendStage(nextStage, profile);
        }
    }

    async checkAndSendDayOfWeekStages() {
        let db = await getDb();
        let dayOfWeek = moment().isoWeekday()-1;
        let startOfToday = moment().startOf('d').unix();

        let dowStages = await db.collection('stages').aggregate([
            {$match: {
                hasTimer: true,
                timerType: 'dayOfWeek',
                timerValue: dayOfWeek
            }},
            {$lookup: {
                from: 'stages',
                localField: 'nextStage',
                foreignField: 'id',
                as: 'nextStageData'
            }}
        ]).toArray();

        let stagesFound = dowStages && dowStages.length > 0;
        if (!stagesFound) {
            return;
        }

        let stageProfileConds = dowStages.map(stage => {
            return {funnelId: stage.funnelId, stageId: stage.id};
        });

        let profiles = await db.collection('profiles').find({
            blocked: {$in: [null, false]},
            stageTime: {$lte: startOfToday},
            $or: stageProfileConds
        }).toArray();
        return this.sendStagesToProfiles(profiles, dowStages);
    }

    async checkAndSendInSomeDaysStages() {
        let db = await getDb();

        let inSomeDaysStages = await db.collection('stages').aggregate([
            {$match: {hasTimer: true, timerType: 'inSomeDays'}},
            {$lookup: {
                    from: 'stages',
                    localField: 'nextStage',
                    foreignField: 'id',
                    as: 'nextStageData'
                }
            }
        ]).toArray();

        let stagesFound = inSomeDaysStages && inSomeDaysStages.length > 0;
        if (!stagesFound) {
            return;
        }

        let stageProfileConds = inSomeDaysStages.map(stage => {
            let nextStageDays = stage.timerValue;
            let nDaysAgo = moment().subtract(nextStageDays, 'd').endOf('d').unix();

            return {funnelId: stage.funnelId, stageId: stage.id, stageTime: {$lte: nDaysAgo}};
        });

        let profiles = await db.collection('profiles').find({blocked: {$in: [null, false]}, $or: stageProfileConds}).toArray();

        return this.sendStagesToProfiles(profiles, inSomeDaysStages);
    }

    async checkAndSendDailyStages() {
        return Promise.all([ this.checkAndSendDayOfWeekStages(), this.checkAndSendInSomeDaysStages() ]);
    }

    async checkAndSendExactStages() {
        let db = await getDb();
        let now = moment().unix();

        let exactStages = await db.collection('stages').aggregate([
            {$match: {
                hasTimer: true,
                timerType: 'exact',
                timerValue: {$lte: now},
                sent: {$in: [null, false]}
            }},
            {$lookup: {
                    from: 'stages',
                    localField: 'nextStage',
                    foreignField: 'id',
                    as: 'nextStageData'
                }
            }
        ]).toArray();

        let stagesFound = exactStages && exactStages.length > 0;
        if (!stagesFound) {
            return;
        }

        let stageProfileConds = exactStages.map(stage => ({funnelId: stage.funnelId, stageId: stage.id}));
        let profiles = await db.collection('profiles').find({blocked: {$in: [null, false]}, $or: stageProfileConds}).toArray();

        let sendResult = await this.sendStagesToProfiles(profiles, exactStages);
        let sent = moment().unix();
        for (let stage of exactStages) {
            await db.collection('stages').updateOne({id: stage.id, funnelId: stage.funnelId}, {$set: {sent}});
            await db.collection('funnels').updateOne({id: stage.funnelId}, {$set: {finished: sent}});
        }

        return sendResult;
    }

    async checkAndSendSecondsStages() {
        let db = await getDb();
        let now = moment().unix();
        let stagesToSend = await db.collection('stages').aggregate([
            { $match: {hasTimer: true, timerType: 'seconds'} },
            { $lookup: {
                    from: 'stages',
                    localField: 'nextStage',
                    foreignField: 'id',
                    as: 'nextStageData'
                }
            },
            { $lookup: {
                    from: 'profiles',
                    let: {
                        stageId: "$id",
                        seconds: "$timerValue",
                    },
                    pipeline: [
                        { $addFields: {sendNextStageAt: {$add: ["$stageTime", "$$seconds"]}} },
                        { $match: {
                                $and: [
                                    { $expr: {$eq:["$stageId", "$$stageId"]} },
                                    { $expr: {$lte: ["$sendNextStageAt", now]} },
                                ]
                            }
                        }
                    ],
                    as: 'profiles'
                } },
            { $match: {profiles: {$exists: true, $not: {$size: 0}}} }
        ]).toArray();

        let stagesFound = stagesToSend && stagesToSend.length > 0;
        if (!stagesFound) {
            return;
        }

        for (let stage of stagesToSend) {
            let profiles = stage.profiles;
            await this.sendStagesToProfiles(profiles, [stage]);
        }
    }

    launchExactCheck() {
        return setTimeout(async () => {
            this.exactLoop = true;
            let closestRoundMinutes = Math.ceil( moment().get('m')/ROUND_EXACT_TO_MINS ) * ROUND_EXACT_TO_MINS;
            let waitTill = moment().startOf('h').set('minute', closestRoundMinutes).unix();
            let now = moment().unix();

            if (waitTill > now) {
                await wait((waitTill - now) * 1000);
            }

            while (this.exactLoop) {
                await this.checkAndSendExactStages();

                await wait(STAGEMAILER_CHECK_INTERVAL_SEC * 1000);
                await eventLoopQueue();
            }
        }, 0);

    }

    launchDailyCheck() {
        return setTimeout(async () => {
            this.dailyLoop = true;

            let now = moment().unix();
            await wait((this.nextDailyCheck - now) * 1000);

            while (this.dailyLoop) {
                await this.checkAndSendDailyStages();
                await wait(DAY_MSEC);
            }
        }, 0);
    }

    launchSecondsCheck() {
        return setTimeout(async () => {
            this.secondsLoop = true;

            while (this.secondsLoop) {
                await this.checkAndSendSecondsStages();
                await wait(STAGEMAILER_SECONDS_CHECK_INTERVAL_SEC);
            }
        }, 0);
    }

    launch() {
        this.launchDailyCheck();
        this.launchExactCheck();
        this.launchSecondsCheck();
    }

}