const {getDb} = require('../lib/database');
const setupBot = require('../lib/setup');

const COLLECTION_NAME = 'bots';

module.exports = class BotManager {
    constructor() {
        this.runningBots = [];
        this.allBots = [];
        this.botFunnels = [];
    }

    createBot(bot) {
        let app = setupBot(bot.token)
            .addSession({})
            .addSafeReply()
            .addIdsToSession()
            .addRefSave()
            .addUserSave()
            .addProfile()
            .addSaveActivity()
            .addFunnels(bot, this)
            .addScenes()
            .addDefaultRoute(ctx => ctx.scene.enter('stage'))
            .get();

        app.launch();

        return app;
    }

    stopBot(botToStop) {
        let botIndex = this.allBots.findIndex(bot => bot.id === botToStop.id);
        if (botIndex !== -1) {
            let app = this.runningBots.splice(botIndex, 1);
            app.stop();
        }
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
            'id': {$in: bot.funnels},
            'deleted': {$in: [null, false]}
        };

        let db = await getDb();
        this.botFunnels = await db.collection('funnels').find(filter).toArray();
        return this.botFunnels;
    }

    async launchBots() {
        await this.loadBots();
        this.runningBots = this.allBots.map(this.createBot.bind(this));
    }
}