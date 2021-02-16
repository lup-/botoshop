const setupBot = require('./lib/setup');
const Mailer = require('./managers/Mailer');
const Payment = require('./managers/Payment');

const mailer = new Mailer();
const payment = new Payment();

const BOT_TOKEN = process.env.BOT_TOKEN;
const MANAGER_CHAT_ID = process.env.MANAGER_CHAT_ID;
const SOURCE_CHANNEL_ID = process.env.SOURCE_CHANNEL_ID;

let app = setupBot(BOT_TOKEN)
    .addSession({})
    .addSafeReply()
    .addIdsToSession()
    .addRefSave()
    .addUserSave()
    .addProfile()
    .addSaveActivity()
    .addScenes(false, {payment})
    .addRoute('on', 'channel_post', async (ctx, next) => {
        let isSourceChannelMessage = ctx.channelPost && ctx.channelPost.chat &&
            (ctx.channelPost.chat.username === SOURCE_CHANNEL_ID || ctx.channelPost.chat.id.toString() === SOURCE_CHANNEL_ID.toString());

        if (isSourceChannelMessage) {
            let isCreated = await mailer.createMailing(ctx.channelPost);
            if (isCreated) {
                return ctx.tg.sendMessage(MANAGER_CHAT_ID, 'Рассылка создана');
            }

            return ctx.tg.sendMessage(MANAGER_CHAT_ID, 'Ошибка создания рассылки');
        }

        next();
    })
    .addRoute('action', 'renew_subscription', ctx => ctx.scene.enter('subscribe'))
    .addRoute('action', 'retry', ctx => ctx.scene.enter('subscribe'))
    .addDefaultRoute(ctx => ctx.scene.enter('intro'))
    .get();

mailer.setBlockedHandler(queueItem => {
    let userId = queueItem.userId;
    return payment.removeSubscribeByUserId(userId);
});

app.launch();
mailer.launch();
payment.launchPaymentReminder();
payment.launchPeriodicPayments();
payment.launchPaymentWatch();

process.on('SIGTERM', async () => {
    console.info('Получен сигнал SIGTERM, завершаю работу');
    await mailer.stop();
    await payment.stop();
});