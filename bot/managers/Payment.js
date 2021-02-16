const moment = require('moment');
const axios = require('axios');
const shortid = require('shortid');
const {Telegraf} = require('telegraf');
const {getDb} = require('../lib/database');
const {wait, eventLoopQueue, menu} = require('../lib/helpers');

const BOT_TOKEN = process.env.BOT_TOKEN;
const PAYMENT_CHECK_INTERVAL_SEC = process.env.PAYMENT_CHECK_INTERVAL_SEC ? parseInt(process.env.PAYMENT_CHECK_INTERVAL_SEC) : 60;
const PAYMENT_STATUS_CHECK_INTERVAL_SEC = process.env.PAYMENT_STATUS_CHECK_INTERVAL_SEC ? parseInt(process.env.PAYMENT_STATUS_CHECK_INTERVAL_SEC) : 60;
const YOO_BASE_URL = 'https://api.yookassa.ru/v3/';
const YOO_SHOP_ID = process.env.YOO_SHOP_ID;
const YOO_SECRET_KEY = process.env.YOO_SECRET_KEY;
const YOO_TEST = process.env.YOO_TEST === '1';
const PAYMENT_PRICE = process.env.PAYMENT_PRICE ? parseFloat(process.env.PAYMENT_PRICE) : 900;
const ORDER_DESCRIPTION = 'Оплата подписки';

const telegram = (new Telegraf(BOT_TOKEN)).telegram;

module.exports = class Payment {
    constructor() {
        this.runLoop = false;
        this.stopCallback = false;
        this.profileStopCallback = false;
    }
    stop() {
        this.runLoop = false;

        let waitPayments = new Promise(resolve => {
            this.stopCallback = resolve;
        });

        let waitStatus = new Promise(resolve => {
            this.profileStopCallback = resolve;
        });

        return Promise.all([waitPayments, waitStatus]);
    }

    async getPrice() {
        return PAYMENT_PRICE;
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
            save_payment_method: true,
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

        return this.callYooApi(`payments/${payment.id}/capture`, {
            amount: {
                value: price,
                currency: "RUB"
            }
        });
    }
    async addPaymentAndGetPaymentUrl(ctx, price = false) {
        if (!price) {
            price = await this.getPrice();
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
                price,
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

    async getLastPayment(userId) {
        let db = await getDb();
        let payments = await db.collection('payments').aggregate([
            {$match: {"profile.userId": userId}},
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
            lastPayment: {$gt: 0},
        }).toArray();
    }
    async getProcessingPayments() {
        let db = await getDb();
        return db.collection('payments').find({finished: {$in: [null, false]}}).toArray();
    }
    async checkAndFinishPayment(payment) {
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
                    return this.finishPayment(dbPayment);
                }
            }

        }
        catch (e) {
            console.log(e);
        }

        return false;
    }
    async finishPayment(payment) {
        let profile = payment.profile;
        let chatId = profile.chatId;

        let db = await getDb();
        await db.collection('payments').updateOne({id: payment.id}, {$set: {finished: moment().unix()}});

        if (payment.status === 'succeeded') {
            let nextMonth = moment().add(1, 'month').unix();
            await db.collection('profiles').updateOne({id: profile.id}, {$set: {
                subscribed: true,
                subscribedTill: nextMonth,
                lastPayment: moment().unix()
            }});
            await telegram.sendMessage(chatId, `Мы приняли ваш платеж, спасибо! Вы подписаны`);
        }
        else {
            await telegram.sendMessage(chatId, `Последний платеж не прошел`, menu([{code: 'retry', text: 'Попробовать еще раз'}]));
        }
    }
    async addAutoPaymentAndSaveToDb(profile) {
        let price = await this.getPrice();

        let lastPayment = await this.getLastPayment(profile.userId);
        if (!lastPayment) {
            return false;
        }

        let isPaymentProcessing = lastPayment.status !== 'succeeded' && lastPayment.status !== 'canceled';
        if (isPaymentProcessing) {
            return false;
        }

        let paymentMethodId = lastPayment.yooPayment.payment_method.id;
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

    async removeSubscribe(profile) {
        let db = await getDb();
        return db.collection('profiles').updateOne({id: profile.id}, {$set: {subscribed: false}});
    }

    async subscribeWithoutPayment(userId) {
        let db = await getDb();
        return db.collection('profiles').updateOne({userId}, {$set: {subscribed: true}});
    }

    async isSubscribed(userId) {
        let now = moment().unix();
        let db = await getDb();
        let profile = await db.collection('profiles').findOne({userId});
        let hasDateLimit = profile && profile.subscribedTill && profile.subscribedTill > 0;
        let hasNoDateLimit = !hasDateLimit;
        let dateIsNotExpired = hasDateLimit && profile.subscribedTill >= now;
        return Boolean(profile && profile.subscribed && (hasNoDateLimit || dateIsNotExpired) );
    }

    async needsPaymentToSubscribe(userId) {
        let now = moment().unix();
        let db = await getDb();
        let profile = await db.collection('profiles').findOne({userId});
        let hasDateLimit = profile && profile.subscribedTill && profile.subscribedTill > 0;
        let isNewSubscriber = !hasDateLimit;
        let dateIsExpired = hasDateLimit && profile.subscribedTill < now;
        return isNewSubscriber || dateIsExpired;
    }

    async removeSubscribeByUserId(userId) {
        let db = await getDb();
        let profile = await db.collection('profiles').findOne({userId});
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
    launchPaymentWatch() {
        return setTimeout(async () => {
            this.runLoop = true;

            while (this.runLoop) {
                try {
                    let payments = await this.getProcessingPayments();

                    if (payments && payments.length > 0) {
                        for (const payment of payments) {
                            await this.checkAndFinishPayment(payment);
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