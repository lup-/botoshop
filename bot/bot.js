const Mailer = require('./managers/Mailer');
const Bots = require('./managers/Bots');

const mailer = new Mailer();
const bots = new Bots();

(async () => {
    await bots.launchBots();
    mailer.launch();

    process.on('SIGTERM', async () => {
        console.info('Получен сигнал SIGTERM, завершаю работу');
        await mailer.stop();
        process.exit();
    });
})();
