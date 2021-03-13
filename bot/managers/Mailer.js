const {Telegraf} = require('telegraf');
const BOT_TOKEN = process.env.BOT_TOKEN;
const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID;
const tg = new Telegraf(BOT_TOKEN).telegram;

const moment = require('moment');
const {getDb} = require('../lib/database');

const {wait, eventLoopQueue} = require('../lib/helpers');
const Sender = require('./Sender');

const STATUS_NEW = 'new';
const MAILING_STATUS_NEW = 'new';
const MAILING_STATUS_PROCESSING = 'processing';
const MAILING_STATUS_FINISHED = 'finished';

const MAILINGS_CHECK_INTERVAL_SEC = process.env.MAILINGS_CHECK_INTERVAL_SEC ? parseInt(process.env.MAILINGS_CHECK_INTERVAL_SEC) : 60;
const TEST_USER_ID = process.env.TEST_USER_ID || 483896081;
const TEST_CHAT_ID = process.env.TEST_CHAT_ID || TEST_USER_ID;
const TEST_BOT_ID = process.env.TEST_BOT_ID || '';
const TEST_QUEUE_SIZE = process.env.TEST_QUEUE_SIZE ? parseInt(process.env.TEST_QUEUE_SIZE) : 100;
const ARCHIVE_DAYS = 3;

module.exports = class Mailer {
    constructor() {
        this.runLoop = false;
        this.activeSenders = [];
        this.stopCallback = false;
        this.blockedHandler = false;
    }

    async blockUser(chat, bot) {
        let db = await getDb();
        let now = moment().unix();
        await db.collection('users').updateOne({id: chat.userId, botId: bot.botId}, {$set: {blocked: now}});
        return db.collection('profiles').updateOne({userId: chat.userId, botId: bot.botId}, {$set: {blocked: now}});
    }

    setBlockedHandler(blockedHandler) {
        this.blockedHandler = blockedHandler;
    }

    async makeTestQueue(mailing) {
        if (!mailing.id) {
            return false;
        }

        return Array(TEST_QUEUE_SIZE).fill(false).map(_ => ({
            mailing: mailing.id,
            bot: TEST_BOT_ID,
            userId: TEST_USER_ID,
            chatId: TEST_CHAT_ID,
            status: STATUS_NEW
        }));
    }

    async makeQueue(mailing) {
        if (mailing.isTest) {
            return this.makeTestQueue(mailing);
        }

        let db = await getDb();
        let botIds = mailing.bots;
        let foundUsers = await db.collection('users').find({
            botId: {$in: botIds},
            blocked: {$in: [null, false]},
        }).toArray();

        return foundUsers.map(user => ({
            mailing: mailing.id,
            bot: user.botId,
            userId: user.user.id,
            chatId: user.chat.id,
            status: STATUS_NEW
        }));
    }

    async initQueue(mailing) {
        if (!mailing.id) {
            return false;
        }

        let db = await getDb();
        let queueCount = await db.collection('mailingQueue').countDocuments({mailing: mailing.id});
        if (queueCount > 0) {
            return;
        }

        let queue = await this.makeQueue(mailing);

        if (queue.length > 0) {
            let result = await db.collection('mailingQueue').insertMany(queue);
            return result && result.result && result.result.ok;
        }

        return false;
    }

    async initProgress(mailing) {
        let db = await getDb();
        await db.collection('mailings').updateOne({id: mailing.id}, {$set: {
            dateStarted: moment().unix(),
            status: MAILING_STATUS_PROCESSING,
        }});

        if (!mailing.total) {
            let queueCount = await db.collection('mailingQueue').countDocuments({mailing: mailing.id});

            await db.collection('mailings').updateOne({id: mailing.id}, {$set: {
                total: queueCount
            }});
        }
    }

    clearSender(mailingId, botId) {
        let index = this.activeSenders.findIndex(item => item.mailing.id === mailingId && item.bot.id === botId);
        if (index !== -1) {
            this.activeSenders.splice(index, 1);
        }
    }

    async finishMailing(mailingId) {
        let db = await getDb();
        let archiveTime = moment().add(ARCHIVE_DAYS, 'day').unix();
        await db.collection('mailings').updateOne({id: mailingId}, {$set: {
            archiveAt: archiveTime,
            dateFinished: moment().unix(),
            status: MAILING_STATUS_FINISHED,
        }});

        let mailing = await db.collection('mailings').findOne({id: mailingId});
        let message = `Рассылка закончена
        
Успешно: ${mailing.success || 0}
Блокировок: ${mailing.blocks || 0}
Ошибок: ${mailing.errors || 0}`;

        try {
            await tg.sendMessage(MANAGER_CHAT_ID, message);
        }
        catch (e) {}

        return true;
    }

    async getPendingMailings() {
        let db = await getDb();
        let now = moment().unix();
        return db.collection('mailings').find({
            startAt: {'$lte': now},
            status: {'$in': [MAILING_STATUS_NEW, MAILING_STATUS_PROCESSING]},
        }).toArray();
    }

    async getPendingMailingsToArchive() {
        let db = await getDb();
        let now = moment().unix();
        return db.collection('mailings').find({
            archiveAt: {'$lte': now},
            archived: {$in: [null, false]},
            status: MAILING_STATUS_FINISHED,
        }).toArray();
    }

    async getNewMailings() {
        let allMailings = await this.getPendingMailings();
        let mailingIdsInWork = this.activeSenders
            .map(item => item.mailing.id)
            .filter( (id, index, ids) => ids.indexOf(id) === index );
        return allMailings.filter(mailing => mailingIdsInWork.indexOf(mailing.id) === -1);
    }

    getActiveSender(mailingId, botId) {
        return this.activeSenders.find(item => item.mailing.id === mailingId && item.bot.id === botId) || false;
    }

    async getMailingBots(mailing) {
        let botIds = mailing.bots;
        let db = await getDb();
        return db.collection('bots').find({ id: {$in: botIds} }).toArray();
    }

    async startSending(mailing) {
        await this.initQueue(mailing);
        await this.initProgress(mailing);

        return new Promise(async resolve => {
            let bots = await this.getMailingBots(mailing);
            let botMailerPromises = [];

            for (const botIndex in bots) {
                let bot = bots[botIndex];

                let activeSender = this.getActiveSender(mailing.id, bot.id);
                if (activeSender) {
                    continue;
                }

                let sender = new Sender(mailing.id);
                await sender.init(mailing, bot, this.blockedHandler);

                this.activeSenders.push({mailing, bot, sender});
                botMailerPromises.push(new Promise(async resolveBot => {
                    setTimeout(async () => {
                        await sender.sendAllMessages();
                        await this.clearSender(mailing.id, bot.id);
                        resolveBot();
                    });
                }));
            }

            await Promise.all(botMailerPromises);
            await this.finishMailing(mailing.id);
            resolve();
        });
    }

    async archiveMailing(mailing) {
        let db = await getDb();
        let now = moment().unix();
        await db.collection('mailingQueue').deleteMany({mailing: mailing.id});
        await db.collection('mailings').updateOne({id: mailing.id}, {$set: {
            archived: now,
        }});
    }

    stop() {
        this.runLoop = false;
        return new Promise(resolve => {
            this.stopCallback = resolve;
        });
    }

    async checkAndSendNewMailings() {
        let mailings = await this.getNewMailings();

        if (mailings && mailings.length > 0) {
            for (const mailing of mailings) {
                await this.startSending(mailing);
            }
        }
    }

    async checkAndArchiveOldMailings() {
        let mailings = await this.getPendingMailingsToArchive();

        if (mailings && mailings.length > 0) {
            for (const mailing of mailings) {
                await this.archiveMailing(mailing);
            }
        }
    }

    launch() {
        return setTimeout(async () => {
            this.runLoop = true;

            while (this.runLoop) {
                await this.checkAndSendNewMailings();
                await this.checkAndArchiveOldMailings();

                await wait(MAILINGS_CHECK_INTERVAL_SEC * 1000);
                await eventLoopQueue();
            }

            if (this.stopCallback) {
                this.stopCallback();
            }
        }, 0);
    }
}
