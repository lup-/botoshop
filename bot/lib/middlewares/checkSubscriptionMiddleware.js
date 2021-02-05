const {getDb} = require('../database');
const { Telegraf } = require('telegraf');
const BOT_TOKEN = process.env.BOT_TOKEN;
const tg = new Telegraf(BOT_TOKEN).telegram;

const MAX_WAIT_TIMEOUT_SEC = 5 * 60;

async function checkSubscribe(tg, chat, userId) {
    let subscriber = await tg.getChatMember(chat, userId);
    let isSubscriber = subscriber && subscriber.status && ["creator", "administrator", "member"].indexOf(subscriber.status) !== -1;
    return isSubscriber;
}

async function waitForSubscription(tg, chat, userId) {
    let timeout = MAX_WAIT_TIMEOUT_SEC * 1000;
    let checkStepTime = 1000;

    return new Promise(resolve => {
        let checkIntervalId;
        let doCheck = async () => {
            let isSubscriber = await checkSubscribe(tg, chat, userId);
            if (isSubscriber) {
                clearInterval(checkIntervalId);
                resolve(isSubscriber);
            }
        };

        checkIntervalId = setInterval(doCheck, checkStepTime);
        doCheck();

        setTimeout(async () => {
            clearInterval(checkIntervalId);
            let isSubscriber = await checkSubscribe(tg, chat, userId);
            resolve(isSubscriber);
        }, timeout);
    });
}

module.exports = async (ctx, next) => {
    let skipThisUpdate = ctx.chat.type !== 'private';
    if (skipThisUpdate) {
        return next();
    }

    if (ctx && ctx.session && ctx.session.delaySubscribeCheck) {
        return next();
    }

    if (ctx && ctx.session && ctx.session.subscribtionSuccess) {
        return next();
    }

    let botName = process.env.BOT_NAME;
    let db = await getDb('botofarmer');
    let settings = db.collection('botSettings');
    let botSettings = await settings.findOne({botName});
    let needsSubscription = botSettings && botSettings.needsSubscription && botSettings.needsSubscription.length > 0;

    if (needsSubscription) {
        let chatUsername = botSettings.needsSubscription;
        let userId = ctx.from ? ctx.from.id : false;

        let isSubscriber = false;

        if (userId) {
            try {
                isSubscriber = await checkSubscribe(ctx.tg, chatUsername, userId);
            }
            catch (e) {
                isSubscriber = true;
            }
        }

        if (!isSubscriber) {
            let chatId = ctx.chat.id;
            setTimeout(async () => {
                try {
                    await tg.sendMessage(chatId,'Сначала необходимо подписаться на '+chatUsername);
                    isSubscriber = await waitForSubscription(ctx.tg, chatUsername, userId);
                    if (isSubscriber) {
                        await tg.sendMessage(chatId,'Спасибо, что подписались! Повторите последнее действие, пожалуйста');
                        return next();
                    }
                }
                catch (e) {
                    console.log('Subscribe', e);
                }
            }, 0);
            return;
        }
    }

    if (ctx.session) {
        ctx.session.subscribtionSuccess = true;
    }

    return next();
}