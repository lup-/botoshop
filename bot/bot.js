const Mailer = require('./managers/Mailer');
const Bots = require('./managers/Bots');
const HttpInterface = require('./httpInterface');

const mailer = new Mailer();
const bots = new Bots();
const http = new HttpInterface(bots);

(async () => {
    await bots.launchBots();
    mailer.setBlockedHandler(mailer.blockUser);
    mailer.launch();
    http.launch();

    process.on('SIGTERM', async () => {
        console.info('Получен сигнал SIGTERM, завершаю работу');
        await mailer.stop();
        process.exit();
    });
})();
