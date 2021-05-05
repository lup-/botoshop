const moment = require('moment');
const axios = require('axios');
const shortid = require('shortid');
const {Telegraf} = require('telegraf');
const {getDb} = require('../lib/database');
const {wait, eventLoopQueue, menu} = require('../lib/helpers');
const {cleanMessages, addMessage} = require('../lib/cleanup');

const PAYMENT_CHECK_INTERVAL_SEC = process.env.PAYMENT_CHECK_INTERVAL_SEC ? parseInt(process.env.PAYMENT_CHECK_INTERVAL_SEC) : 60;
const PAYMENT_STATUS_CHECK_INTERVAL_SEC = process.env.PAYMENT_STATUS_CHECK_INTERVAL_SEC ? parseInt(process.env.PAYMENT_STATUS_CHECK_INTERVAL_SEC) : 60;
const YOO_BASE_URL = 'https://api.yookassa.ru/v3/';
const YOO_SHOP_ID = process.env.YOO_SHOP_ID;
const YOO_SECRET_KEY = process.env.YOO_SECRET_KEY;
const YOO_TEST = process.env.YOO_TEST === '1';
const YOO_TEST_SUM = process.env.YOO_TEST_SUM === '1';
const USE_REPEATING_PAYMENTS = process.env.USE_REPEATING_PAYMENTS === '1';
const ORDER_DESCRIPTION = 'Оплата покупки';

module.exports = class Payment {
    constructor() {
        this.runLoop = false;
        this.stopCallback = false;
        this.profileStopCallback = false;
        this.remindStopCallback = false;
    }
    stop() {
        let waitPayments = new Promise(resolve => {
            this.stopCallback = resolve;
        });

        let waitStatus = new Promise(resolve => {
            this.profileStopCallback = resolve;
        });

        let waitReminds = new Promise(resolve => {
            this.remindStopCallback = resolve;
        });

        this.runLoop = false;

        return Promise.all([waitPayments, waitStatus, waitReminds]);
    }

    markMessageToDelete(message) {
        let botId = message.from.id;
        let chatId = message.chat.id;
        let messageId = message.message_id;

        return addMessage(botId, chatId, messageId);
    }
    getReturnUrl(ctx) {
        return `https://t.me/${ctx.me}`;
    }

    async callYooApi(method, inputData) {
        let url = YOO_BASE_URL + method;
        if (inputData) {
            let {data} = await axios.post(url, inputData, {
                auth: {
                    username: YOO_SHOP_ID,
                    password: YOO_SECRET_KEY
                },
                headers: {
                    'Idempotence-Key': shortid.generate()
                }
            });

            return data;
        }
        else {
            let {data} = await axios.get(url, {
                auth: {
                    username: YOO_SHOP_ID,
                    password: YOO_SECRET_KEY
                }
            });

            return data;
        }
    }

    getTariffs() {
        return [
            { duration: '1 месяц', days: 30, price: YOO_TEST_SUM ? 1 : 3500, full: false },
            { duration: '3 месяца', days: 90, price: 9500, full: 10500 },
            { duration: '6 месяцев', days: 180, price: 18000, full: 21000 },
            { duration: '1 год', days: 365, price: 34000, full: 42000 },
        ];
    }
    getTariff(days) {
        return this.getTariffs().find(tariff => tariff.days === days) || false;
    }
    async getPrice(days) {
        let tariff = this.getTariff(days);
        return tariff
            ? tariff.price
            : null;
    }

    async addPayment(price, returnUrl, isTwoStage = false) {
        return this.callYooApi('payments', {
            amount: {
                value: price,
                currency: "RUB"
            },
            capture: !isTwoStage,
            payment_method_data: {
                type: "bank_card"
            },
            confirmation: {
                type: "redirect",
                return_url: returnUrl
            },
            description: ORDER_DESCRIPTION,
            save_payment_method: USE_REPEATING_PAYMENTS,
            test: YOO_TEST
        });
    }
    async addAutoPayment(price, paymentMethodId, isTwoStage = false) {
        return this.callYooApi('payments', {
            amount: {
                value: price,
                currency: "RUB"
            },
            capture: !isTwoStage,
            payment_method_id: paymentMethodId,
            description: ORDER_DESCRIPTION,
            test: YOO_TEST
        });
    }
    async getPaymentInfo(paymentId) {
        return this.callYooApi(`payments/${paymentId}`);
    }
    async confirmPayment(payment, price = false) {
        if (!price) {
            price = payment.price || payment.yooPayment.amount.value;
        }

        return this.callYooApi(`payments/${payment.id}/capture`, {});
    }

    async loadPaymentFromDb(paymentId) {
        let db = await getDb();
        let result = await db.collection('payments').findOne({id: paymentId});
        return result ? result : false;
    }

    async cancelPayment(paymentId, userCanceled = false) {
        let payment = await this.loadPaymentFromDb(paymentId);
        let yooPayment = await this.getPaymentInfo(paymentId);
        let yooCancel = null;

        if (yooPayment.refundable) {
            return this.refundPayment();
        }
        else {
            try {
                yooCancel = await this.callYooApi(`payments/${paymentId}/cancel`, {});
            }
            catch (e) {
                yooCancel = false;
            }
        }

        let freshPayment = await this.getPaymentInfo(paymentId);

        let db = await getDb();
        let result = await db.collection('payments').updateOne({id: payment.id}, {
            $set: {
                updated: moment().unix(),
                finished: moment().unix(),
                userCanceled: userCanceled ? moment().unix() : false,
                status: freshPayment.status,
                yooPayment: freshPayment,
                yooCancel
            }
        }, {});

        let isEverythingOk = result && result.result && result.result.ok === 1;

        return isEverythingOk
            ? this.loadPaymentFromDb(paymentId)
            : false;
    }

    async addPaymentAndSaveToDb(ctx, item) {
        let profile = ctx.session.profile;
        let shopId = ctx.shop.getId();
        let botId = profile.botId;
        let price = item.price;
        let returnUrl = this.getReturnUrl(ctx);
        let yooPayment = await this.addPayment(price, returnUrl);
        let paymentUrl = yooPayment && yooPayment.confirmation && yooPayment.confirmation.confirmation_url
            ? yooPayment.confirmation.confirmation_url
            : false;

        if (yooPayment && paymentUrl) {
            let db = await getDb();
            let result = await db.collection('payments').insertOne({
                id: yooPayment.id,
                shopId,
                botId,
                created: moment().unix(),
                status: yooPayment.status,
                type: 'item',
                item,
                price,
                repeating: USE_REPEATING_PAYMENTS,
                profile,
                yooPayment,
                paymentUrl
            });

            return result.ops && result.ops[0] ? result.ops[0] : false;
        }
        else {
            return false;
        }
    }
    async addTgPaymentAndSaveToDb(ctx, item) {

    }
    async addPaymentAndGetPaymentUrl(ctx, item) {
        let payment = await this.addPaymentAndSaveToDb(ctx, item);

        if (payment && payment.paymentUrl) {
            return payment.paymentUrl;
        }
        else {
            return false;
        }
    }
    async addSubscriptionPaymentAndGetPaymentUrl(ctx, price = false, days = false) {
        if (!price) {
            price = await this.getPrice(days);
        }

        let profile = ctx.session.profile;
        let returnUrl = this.getReturnUrl(ctx);
        let yooPayment = await this.addPayment(price, returnUrl);
        let paymentUrl = yooPayment && yooPayment.confirmation && yooPayment.confirmation.confirmation_url
            ? yooPayment.confirmation.confirmation_url
            : false;

        if (yooPayment && paymentUrl) {
            let db = await getDb();
            let result = await db.collection('payments').insertOne({
                id: yooPayment.id,
                created: moment().unix(),
                status: yooPayment.status,
                type: 'subscription',
                price,
                days,
                repeating: USE_REPEATING_PAYMENTS,
                profile,
                yooPayment,
                paymentUrl
            });

            return result.ops && result.ops[0] ? paymentUrl : false;
        }
        else {
            return false;
        }
    }

    async getLastPayment(userId, shopId) {
        let db = await getDb();
        let payments = await db.collection('payments').aggregate([
            {$match: {"profile.userId": userId, shopId}},
            {$sort: {finished: -1}},
            {$limit: 1}
        ]).toArray()

        return payments && payments[0]
            ? payments[0]
            : false;
    }
    async getPendingPaymentProfiles() {
        let db = await getDb();
        let now = moment().unix();
        return db.collection('profiles').find({
            subscribed: true,
            blocked: {$in: [null, false]},
            subscribedTill: {$lt: now},
            autoSubscribe: true,
        }).toArray();
    }
    async getProcessingPayments() {
        let db = await getDb();
        return db.collection('payments').find({
            finished: {$in: [null, false]},
            userCanceled: {$in: [null, false]}
        }).toArray();
    }
    async checkAndFinishPayment(payment, onSuccessfulPayment = false) {
        try {
            let freshPayment = await this.getPaymentInfo(payment.id);

            let db = await getDb();
            let result = await db.collection('payments').updateOne({id: payment.id}, {
                $set: {
                    updated: moment().unix(),
                    status: freshPayment.status,
                    yooPayment: freshPayment
                }
            }, {});

            let dbPayment = result && result.result && result.result.ok === 1
                ? await db.collection('payments').findOne({id: payment.id})
                : false;

            if (dbPayment) {
                if (dbPayment.status === 'waiting_for_capture') {
                    return this.confirmPayment(dbPayment);
                }

                if (dbPayment.status === 'succeeded' || dbPayment.status === 'canceled') {
                    return this.finishPayment(dbPayment, onSuccessfulPayment);
                }
            }

        }
        catch (e) {
            console.log(e);
        }

        return false;
    }
    async getShopById(shopId) {
        let db = await getDb();
        let shop = await db.collection('shops').findOne({id: shopId});
        return shop || null;
    }

    async getTelegramByShop(shop) {
        let hasBot = shop && shop.settings && shop.settings.botToken;

        if (!hasBot) {
            return null;
        }

        let telegraph = new Telegraf(shop.settings.botToken);
        return telegraph.telegram;
    }

    async getTelegramByPayment(payment) {
        let shopId = payment.shopId;
        let shop = this.getShopById(shopId);
        return this.getTelegramByShop(shop);
    }

    async finishPayment(payment, onSuccessfulPayment = false) {
        let profile = payment.profile;
        let chatId = profile.chatId;
        let shopId = payment.shopId;
        let shop = await this.getShopById(shopId);
        let telegram = await this.getTelegramByShop(shop);

        let db = await getDb();
        await db.collection('payments').updateOne({id: payment.id}, {$set: {finished: moment().unix()}});

        if (payment.status === 'succeeded') {
            await db.collection('profiles').updateOne({id: profile.id}, {$set: {
                    lastPayment: moment().unix(),
                }});
            await cleanMessages()
            let message = await telegram.sendMessage(chatId, `Мы приняли ваш платеж, спасибо!`);
            this.markMessageToDelete(message);

            if (typeof onSuccessfulPayment === 'function') {
                onSuccessfulPayment(payment, shop, profile, telegram);
            }
        }
        else {
            let message = await telegram.sendMessage(chatId, `Последний платеж не прошел`, menu([
                {text: 'Попробовать еще раз', code: 'retry'},
                {text: 'Отмена', code: `cancel_${payment.id}`}
            ]));
            this.markMessageToDelete(message);
        }
    }
    async refundPayment(payment) {
        let yooRefund = await this.callYooApi('refunds', {
            amount: {
                value: payment.price,
                currency: "RUB"
            },
            payment_id: payment.id,
        });

        let freshPayment = await this.getPaymentInfo(payment.id);

        let db = await getDb();
        let result = await db.collection('payments').updateOne({id: payment.id}, {
            $set: {
                updated: moment().unix(),
                status: freshPayment.status,
                yooPayment: freshPayment,
                yooRefund
            }
        }, {});

        let isEverythingOk = yooRefund && yooRefund.status === 'succeeded' && result && result.result && result.result.ok === 1;

        return isEverythingOk
            ? await db.collection('payments').findOne({id: payment.id})
            : false;
    }
    async addAutoPaymentAndSaveToDb(profile) {
        let lastPayment = await this.getLastPayment(profile.userId);
        if (!lastPayment) {
            return false;
        }

        let price = lastPayment.price;
        let isPaymentProcessing = lastPayment.status !== 'succeeded' && lastPayment.status !== 'canceled';
        if (isPaymentProcessing) {
            return false;
        }

        if (!lastPayment.repeating) {
            return false;
        }

        let paymentMethodId = lastPayment.yooPayment.payment_method
            ? lastPayment.yooPayment.payment_method.id || false
            : false;
        if (!paymentMethodId) {
            return false;
        }

        let yooPayment = await this.addAutoPayment(price, paymentMethodId);

        if (yooPayment) {
            let db = await getDb();
            let result = await db.collection('payments').insertOne({
                id: yooPayment.id,
                created: moment().unix(),
                status: yooPayment.status,
                price,
                profile,
                yooPayment,
                auto: true
            });

            return result.ops && result.ops[0] ? result.ops[0] : false;
        }
        else {
            return false;
        }
    }

    async getPendingProfilesToRemind() {
        let db = await getDb();
        let now = moment().unix();
        let inThreeDays = moment().add(3, 'day').unix();
        return db.collection('profiles').find({
            subscribed: true,
            blocked: {$in: [null, false]},
            $and: [
                { subscribedTill: {$lt: inThreeDays} },
                { subscribedTill: {$gt: now} },
            ],
            $or: [
                { lastRemind: {$lt: {$subtract: ["$subscribedTill", 86400*3]}} },
                { lastRemind: {$exists: false} }
            ],
        }).toArray();
    }
    async remindAndSave(profile) {
        let chatId = profile.chatId;
        let shopId = profile.shopId;
        let shop = await this.getShopById(shopId);
        let telegram = await this.getTelegramByShop(shop);

        await telegram.sendMessage(
            chatId,
            `Здравствуйте. Ваш Премиум доступ к материалам бота истекает через 3 дня.

Чтобы продлить доступ, воспользуйтесь этой ссылкой:`,
            menu([{code: 'renew_subscription', text: 'Продлить подписку'}])
        );

        let db = await getDb();
        return db.collection('profiles').updateOne({id: profile.id, shopId: profile.shopId}, {$set: {lastRemind: moment().unix()}});
    }

    async removeSubscribe(profile) {
        let db = await getDb();
        return db.collection('profiles').updateOne({id: profile.id, shopId: profile.shopId}, {$set: {subscribed: false}});
    }
    async subscribeWithoutPayment(userId, shopId) {
        let db = await getDb();
        return db.collection('profiles').updateOne({userId, shopId}, {$set: {subscribed: true}});
    }
    async isSubscribed(userId, shopId) {
        let now = moment().unix();
        let db = await getDb();
        let profile = await db.collection('profiles').findOne({userId, shopId});
        let hasDateLimit = profile && profile.subscribedTill && profile.subscribedTill > 0;
        let hasNoDateLimit = !hasDateLimit;
        let dateIsNotExpired = hasDateLimit && profile.subscribedTill >= now;
        return Boolean(profile && profile.subscribed && (hasNoDateLimit || dateIsNotExpired) );
    }
    async needsPaymentToSubscribe(userId, shopId, days) {
        let subscribeTo = moment().add(days, 'day').unix();
        let db = await getDb();
        let profile = await db.collection('profiles').findOne({userId, shopId});
        let hasDateLimit = profile && profile.subscribedTill && profile.subscribedTill > 0;
        let isNewSubscriber = !hasDateLimit;
        let dateIsExpired = hasDateLimit && profile.subscribedTill < subscribeTo;
        return isNewSubscriber || dateIsExpired;
    }
    async removeSubscribeByUserId(userId, shopId) {
        let db = await getDb();
        let profile = await db.collection('profiles').findOne({userId, shopId});
        if (profile) {
            return this.removeSubscribe(profile);
        }

        return false;
    }

    launchPeriodicPayments() {
        return setTimeout(async () => {
            this.runLoop = true;

            while (this.runLoop) {
                try {
                    let profiles = await this.getPendingPaymentProfiles();

                    if (profiles && profiles.length > 0) {
                        for (const profile of profiles) {
                            await this.addAutoPaymentAndSaveToDb(profile);
                        }
                    }
                }
                catch (e) {
                    console.log(e);
                }

                await wait(PAYMENT_CHECK_INTERVAL_SEC * 1000);
                await eventLoopQueue();
            }

            if (this.stopCallback) {
                this.stopCallback();
            }
        }, 0);
    }
    launchPaymentReminder() {
        return setTimeout(async () => {
            this.runLoop = true;

            while (this.runLoop) {
                try {
                    let profiles = await this.getPendingProfilesToRemind();

                    if (profiles && profiles.length > 0) {
                        for (const profile of profiles) {
                            await this.remindAndSave(profile);
                        }
                    }
                }
                catch (e) {
                    console.log(e);
                }

                await wait(PAYMENT_CHECK_INTERVAL_SEC * 1000);
                await eventLoopQueue();
            }

            if (this.remindStopCallback) {
                this.remindStopCallback();
            }
        }, 0);
    }
    launchPaymentWatch(onSuccessfulPayment = false) {
        return setTimeout(async () => {
            this.runLoop = true;

            while (this.runLoop) {
                try {
                    let payments = await this.getProcessingPayments();

                    if (payments && payments.length > 0) {
                        for (const payment of payments) {
                            await this.checkAndFinishPayment(payment, onSuccessfulPayment);
                        }
                    }
                }
                catch (e) {
                    console.log(e);
                }

                await wait(PAYMENT_STATUS_CHECK_INTERVAL_SEC * 1000);
                await eventLoopQueue();
            }

            if (this.profileStopCallback) {
                this.profileStopCallback();
            }
        }, 0);
    }
}