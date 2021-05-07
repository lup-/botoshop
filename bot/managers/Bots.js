const {getDb} = require('../lib/database');
const setupBot = require('../lib/setup');
const Payment = require('../managers/Payment');
const {Telegraf} = require('telegraf');
const {menu, escapeHTML} = require('../lib/helpers');
const {makeInvoice} = require('../lib/product');

module.exports = class BotManager {
    constructor() {
        this.runningBots = [];
        this.allShops = [];
        this.botFunnels = [];
    }

    async blockedHandler(ctx, next) {
        if (ctx && ctx.profile) {
            await ctx.profile.setBlocked();
        }
        return next();
    }

    async createBot(shop) {
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
            .addRoute('on', 'message', async (ctx, next) => {
                let isSuccessfulPayment = ctx.update && ctx.update.message && typeof (ctx.update.message.successful_payment) != 'undefined';
                if (isSuccessfulPayment) {
                    const payment = new Payment();
                    let savedPayment = await payment.addTgPaymentAndSaveToDb(ctx);
                    let order = await payment.addOrder(ctx, savedPayment);

                    let product = order.product;
                    let isDownloadable = product && product.files && product.files.length > 0;
                    if (isDownloadable) {
                        await ctx.shop.sendFiles(ctx.telegram, ctx.chat.id, ctx.botInfo.id, null, product);
                        return ctx.reply(`Спасибо за заказ!`, menu([{code: 'discover', text: 'Продолжить покупки'}]));
                    }
                    else {
                        let successMessageTemplate = ctx.shop.getSetting('successMessage') || 'Код вашего заказа :orderId:. Ожидайте, скоро с вами свяжутся!';
                        let successMessage = successMessageTemplate
                            .replace(':orderId:', order.id);

                        return ctx.reply(successMessage, menu([{code: 'discover', text: 'Продолжить покупки'}]));
                    }
                }
                else {
                    next();
                }
            })
            .addRoute('on', 'inline_query', async ctx => {
                try {
                    let foundProducts = ctx.shop.searchProducts(ctx.inlineQuery.query);
                    let top5 = foundProducts.slice(0, 5);

                    let results = [];

                    for (const product of top5) {
                        let thumb_url = product.photos && product.photos[0]
                            ? encodeURI(product.photos[0].src)
                            : null;
                        let {invoice, messageMenu} = await makeInvoice(ctx, product);

                        let result = {
                            type: 'article',
                            id: product.id,
                            title: `${product.title} за ${product.price} руб`,
                            thumb_url,
                            description: escapeHTML(product.description),
                            input_message_content: invoice,
                            reply_markup: messageMenu
                        }

                        results.push(result);
                    }

                    return ctx.answerInlineQuery(results);
                }
                catch (e) {
                    console.log(e);
                }
            })
            .addRoute('on', 'pre_checkout_query', ctx => {
                let queryId = ctx.update.pre_checkout_query.id;
                return ctx.answerPreCheckoutQuery(true, queryId);
            })
            .addDefaultRoute(ctx => ctx.scene.enter('discover'));

        let bot = app.get();
        bot.on()
        bot.shop = shop;
        await bot.launch();

        return bot;
    }

    stopBotByShopId(shopIdToStop) {
        let botIndex = this.runningBots.findIndex(bot => bot && bot.shop ? bot.shop.id === shopIdToStop : false);
        if (botIndex !== -1) {
            let runningBot = this.runningBots[botIndex];
            if (!runningBot) {
                return false;
            }

            return new Promise((resolve, reject) => {
                const TIMEOUT = 3000;
                let wait = 0;

                let interval = null;
                runningBot.stop();

                interval = setInterval(() => {
                    if (wait > TIMEOUT) {
                        clearInterval(interval);
                        reject();
                    }

                    if (runningBot.polling.abortController.signal.aborted) {
                        clearInterval(interval);
                        this.runningBots.splice(botIndex, 1);
                        resolve();
                    }
                    else {
                        wait++;
                    }
                }, 1);
            });
        }

        return false;
    }

    stopBot(shopToStop) {
        return this.stopBotByShopId(shopToStop.id);
    }

    async restartBot(shopToRestart) {
        let stopResult = await this.stopBot(shopToRestart);
        let restartedBot = await this.createBot(shopToRestart);
        if (restartedBot) {
            this.runningBots.push(restartedBot);
        }
        return {stopResult, restartedBot};
    }

    async loadBots() {
        let filter = {
            'settings.botToken': {$nin: [null, false]},
            'stopped': {$in: [null, false]},
            'deleted': {$in: [null, false]}
        };

        let db = await getDb();
        this.allShops = await db.collection('shops').find(filter).toArray();
    }

    async launchBots() {
        await this.loadBots();
        this.runningBots = await Promise.all(this.allShops.map(this.createBot.bind(this)));
        return this.runningBotsInfo();
    }

    async launchNewBots() {
        await this.loadBots();
        let runningBotShopIds = this.runningBots
            .map(telegraf => telegraf.shop ? telegraf.shop.id : false)
            .filter(shopId => shopId !== false)
            .filter((shopId, index, allIds) => allIds.indexOf(shopId) === index);

        let allShopIds = this.allShops.map(shop => shop.id);
        let newShopIds = allShopIds.filter(shopId => runningBotShopIds.indexOf(shopId) === -1);
        if (newShopIds.length > 0) {
            let newShops = this.allShops.filter(shop => newShopIds.indexOf(shop.id) !== -1);
            let newRunningShops = await Promise.all(newShops.map(this.createBot.bind(this)));
            this.runningBots = this.runningBots.concat(newRunningShops);
        }

        return newShopIds.length;
    }

    async stopOldBots() {
        await this.loadBots();
        let runningBotShopIds = this.runningBots
            .map(telegraf => telegraf.shop ? telegraf.shop.id : false)
            .filter(shopId => shopId !== false)
            .filter((shopId, index, allIds) => allIds.indexOf(shopId) === index);

        let allShopIds = this.allShops.map(shop => shop.id);
        let missingShops = runningBotShopIds.filter(shopId => allShopIds.indexOf(shopId) === -1);
        if (missingShops.length > 0) {
            let missingShopIds = this.runningBots
                .filter(telegraf => telegraf.shop && telegraf.shop.id && missingShops.indexOf(telegraf.shop.id) !== -1)
                .map(telegraf => telegraf.shop ? telegraf.shop.id : false)
                .filter(shopId => shopId !== false);

            for (const id in missingShopIds) {
                await this.stopBotByShopId(id);
            }
        }

        return missingShops.length;
    }

    async syncBots() {
        let newBots = await this.launchNewBots();
        let oldBots = await this.stopOldBots();

        return {newBots, oldBots};
    }

    async runningBotsInfo() {
        return this.runningBots.map(telegraf => telegraf ? telegraf.botInfo : null);
    }

    async stopAllBots() {
        let promises = this.runningBots.map(telegraf => this.stopBot({id: telegraf.botDbId}));
        return await Promise.all(promises);
    }

    async restartAll() {
        await this.stopAllBots();
        return this.launchBots();
    }

    async getBotInfoByShop(shop) {
        let settings = shop.settings || {};
        let token = settings.botToken || null;

        if (!token) {
            return null;
        }

        const bot = new Telegraf(token);
        return bot.telegram.getMe();
    }
}
