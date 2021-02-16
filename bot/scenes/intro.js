const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const {menu} = require('../lib/helpers');
const moment = require('moment');

const DISCLAIMER_TEXT = `Этот бот будет присылать торговые сигналы`;

module.exports = function ({payment}) {
    const scene = new BaseScene('intro');

    scene.enter(async ctx => {
        let messageShown = ctx.session.introShown || false;

        if (messageShown) {
            let buttons = [];
            let text = 'Куда дальше?';
            let isSubscribed = await payment.isSubscribed(ctx.session.userId);

            if (isSubscribed) {
                let profile = ctx.session.profile;
                let subscribedTo = moment.unix(profile.subscribedTill).format('DD.MM.YYYY HH:mm')
                text = `Ваша подписка действует до ${subscribedTo}`;
                buttons.push({code: 'unsubscribe', text: 'Отказаться от подписки'});
            }
            else {
                buttons.push({code: 'subscribe', text: 'Оформить подписку'});
            }

            return ctx.safeReply(
                ctx => ctx.editMessageText(text, menu(buttons)),
                ctx => ctx.reply(text, menu(buttons)),
                ctx
            );
        }

        try {
            ctx.session.introShown = true;
            let extra = menu([{code: 'accept', text: 'Понятно'}]);
            return ctx.reply(DISCLAIMER_TEXT, extra);
        }
        catch (e) {
        }
    });

    scene.action('accept', ctx => ctx.scene.reenter());
    scene.action('subscribe', ctx => ctx.scene.enter('subscribe'));
    scene.action('unsubscribe', ctx => ctx.scene.enter('unsubscribe'));

    return scene;
}