const {getDb} = require('../lib/database');
const setupBot = require('../lib/setup');

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

    createBot(shop) {
        let settings = shop.settings || {};
        if (!settings.botToken) {
            return null;
        }

        let app = setupBot(settings.botToken)
            .addSession({})
            .addDeleteReply()
            .addSafeReply(this.blockedHandler)
            .addIdsToSession()
            .addRefSave()
            .addUserSave()
            .addShop(shop, this)
            .addProfile()
            .addSaveActivity()
            .addHandleBlocks()
            .addScenes()
            .addDisclaimer(settings.description, ctx => ctx.scene.enter('menu'))
            .addDefaultRoute(ctx => ctx.scene.enter('discover'));

        let bot = app.get();
        bot.shop = shop;
        bot.launch();

        return bot;
    }

    stopBot(botToStop) {
        let botIndex = this.allBots.findIndex(bot => bot.id === botToStop.id);
        if (botIndex !== -1) {
            let runningBot = this.runningBots.splice(botIndex, 1)[0];
            console.log(botIndex, this.runningBots, runningBot);
            return runningBot ? runningBot.stop() : false;
        }
    }

    async restartBot(botToRestart) {
        await this.stopBot(botToRestart);
        this.createBot(botToRestart);
    }

    async loadBots() {
        let filter = {
            'settings.botToken': {$nin: [null, false]},
            'stopped': {$in: [null, false]},
            'deleted': {$in: [null, false]}
        };

        let db = await getDb();
        this.allBots = await db.collection('shops').find(filter).toArray();
    }

    async launchBots() {
        await this.loadBots();
        this.runningBots = this.allBots.map(this.createBot.bind(this));
        return this.runningBotsInfo();
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
        let runningBotUsernames = this.runningBots.map(telegraf => telegraf.botInfo ? telegraf.botInfo.username : false);
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

    async stopAllBots() {
        let promises = this.runningBots.map(telegraf => this.stopBot({id: telegraf.botDbId}));
        return await Promise.all(promises);
    }

    async restartAll() {
        await this.stopAllBots();
        return this.launchBots();
    }
}