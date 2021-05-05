const Mailer = require('./managers/Mailer');
const Bots = require('./managers/Bots');
const HttpInterface = require('./httpInterface');
const Payment = require('./managers/Payment');
const Shop = require('./managers/Shop');

const mailer = new Mailer();
const bots = new Bots();
const http = new HttpInterface(bots);
const payment = new Payment();

(async () => {
    await bots.launchBots();
    mailer.setBlockedHandler(mailer.blockUser);
    mailer.launch();
    http.launch();

    payment.launchPaymentWatch((payment, shopData, profile, telegram) => {
        let product = payment.item;
        let shop = new Shop(shopData);

        let isDownloadable = product.files && product.files.length > 0;
        if (isDownloadable) {
            return shop.sendFiles(telegram, profile.chatId, profile.botId, null, product);
        }
    });

    process.on('SIGTERM', async () => {
        console.info('Получен сигнал SIGTERM, завершаю работу');
        await mailer.stop();
        process.exit();
    });
})();
