const {getDb} = require('./lib/database');

const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

function catchErrors(thisArg, route) {
    return (ctx) => {
        try {
            return route.call(thisArg, ctx);
        }
        catch (e) {
            ctx.body = {error: e}
        }
    };
}

module.exports = class HttpInterface {
    constructor(botManager) {
        this.botManager = botManager;

        const router = new Router();
        router.get('/sync', catchErrors(this, this.sync));
        router.get('/status', catchErrors(this, this.status));
        router.post('/restartBot', catchErrors(this, this.restartBot));
        router.get('/restartAll', catchErrors(this, this.restartAllBots));

        this.httpIO = new Koa();
        this.httpIO.use(bodyParser()).use(router.routes()).use(router.allowedMethods());
    }

    async sync(ctx) {
        let {newBots, oldBots} = await this.botManager.syncBots();
        ctx.body = {ok: true, newBots, oldBots};
    }

    async status(ctx) {
        let bots = await this.botManager.runningBotsInfo();
        let dbInfo;
        try {
            let db = await getDb();
            let serverDetails = await db.admin().serverStatus();
            let {host, version, uptime} = serverDetails;

            dbInfo = {status: true, server: {host, version, uptime}, error: false};
        }
        catch (e) {
            dbInfo = {status: false, server: false, error: e};
        }

        ctx.body = {bots, db: dbInfo};
    }

    async restartBot(ctx) {
        let bot = ctx.request.body.bot;
        await this.botManager.restartBot(bot)
        ctx.body = {bot};
    }

    async restartAllBots(ctx) {
        let bots = await this.botManager.restartAll();
        ctx.body = {bots}
    }

    launch() {
        return this.httpIO.listen(3000, '0.0.0.0');
    }
}