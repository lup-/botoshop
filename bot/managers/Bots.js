const {getDb} = require('../lib/database');
const setupBot = require('../lib/setup');

const COLLECTION_NAME = 'bots';

module.exports = class BotManager {
    constructor() {
        this.runningBots = [];
        this.allBots = [];
        this.botFunnels = [];
    }

    async blockedHandler(ctx, next) {
        if (ctx && ctx.profile) {
            await ctx.profile.setBlocked();
        }
        return next();
    }

    createBot(bot) {
        let app = setupBot(bot.token)
            .addSession({})
            .addSafeReply(this.blockedHandler)
            .addIdsToSession()
            .addRefSave()
            .addUserSave()
            .addProfile()
            .addSaveActivity()
            .addFunnels(bot, this)
            .addHandleBlocks()
            .addScenes()
            .addRoute('action', /goto\/(.*?)\/(.*)/, async ctx => {
                let buttonId = ctx.match[1];
                let nextStageId = ctx.match[2];

                await ctx.funnel.logButton(buttonId, ctx, ctx.funnel.getId());

                let nextStage = ctx.funnel.getStageById(nextStageId);
                return ctx.scene.enter('stage', {stage: nextStage});
            })
            .addDefaultRoute(ctx => ctx.scene.enter('stage'))
            .get();

        app.botDbId = bot.id;
        app.launch();

        return app;
    }

    stopBot(botToStop) {
        let botIndex = this.allBots.findIndex(bot => bot.id === botToStop.id);
        if (botIndex !== -1) {
            let app = this.runningBots.splice(botIndex, 1);
            return app.stop();
        }
    }

    async restartBot(botToRestart) {
        await this.stopBot(botToRestart);
        this.createBot(botToRestart);
    }

    async loadBots() {
        let filter = {
            'token': {$nin: [null, false]},
            'stopped': {$in: [null, false]},
            'deleted': {$in: [null, false]}
        };

        let db = await getDb();
        this.allBots = await db.collection(COLLECTION_NAME).find(filter).toArray();
    }

    async loadFunnels(bot) {
        let filter = {
            'id': bot.id,
            'deleted': {$in: [null, false]}
        };

        let db = await getDb();
        let botData = await db.collection('bots').aggregate([
            { $match: filter },
            { $lookup: {
                    from: 'funnels',
                    localField: 'funnels',
                    foreignField: 'id',
                    as: 'funnelList'
                }
            }
        ]).toArray();

        this.botFunnels = botData && botData[0] ? botData[0].funnelList : [];
        return this.botFunnels;
    }

    async launchBots() {
        await this.loadBots();
        this.runningBots = this.allBots.map(this.createBot.bind(this));
    }

    async launchNewBots() {
        await this.loadBots();
        let runningBotUsernames = this.runningBots.map(telegraf => telegraf.botInfo.username);
        let allUsernames = this.allBots.map(bot => bot.username);
        let newBotNames = allUsernames.filter(name => runningBotUsernames.indexOf(name) === -1);
        if (newBotNames.length > 0) {
            let newBots = this.allBots.filter(bot => newBotNames.indexOf(bot.username) !== -1);
            let newRunningBots = newBots.map(this.createBot.bind(this));
            this.runningBots = this.runningBots.concat(newRunningBots);
        }

        return newBotNames.length;
    }

    async stopOldBots() {
        await this.loadBots();
        let runningBotUsernames = this.runningBots.map(telegraf => telegraf.botInfo.username);
        let allUsernames = this.allBots.map(bot => bot.username);
        let missingNames = runningBotUsernames.filter(name => allUsernames.indexOf(name) === -1);
        if (missingNames.length > 0) {
            let missingBotIds = this.runningBots
                .filter(telegraf => missingNames.indexOf(telegraf.botInfo.username) !== -1)
                .map(telegraf => telegraf.botDbId);

            for (const id in missingBotIds) {
                await this.stopBot({id});
            }
        }

        return missingNames.length;
    }

    async syncBots() {
        let newBots = await this.launchNewBots();
        let oldBots = await this.stopOldBots();

        return {newBots, oldBots};
    }

    async runningBotsInfo() {
        return this.runningBots.map(telegraf => telegraf.botInfo);
    }
}