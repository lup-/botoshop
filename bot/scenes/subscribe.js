const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const {menu} = require('../lib/helpers');

const USE_REPEATING_PAYMENTS = process.env.USE_REPEATING_PAYMENTS === '1';

module.exports = function ({payment}) {
    const scene = new BaseScene('subscribe');

    scene.enter(async ctx => {
        let text = USE_REPEATING_PAYMENTS
            ? `Вы можете выбрать один из вариантов подписки. Оплата за следующий период будет сниматься автоматически, пока оформлена подписка.`
            : `Вы можете выбрать один из вариантов подписки.`
        let buttons = payment.getTariffs().map(tariff => {
            return {text: `${tariff.days} дней за ${tariff.price} руб`, code: `pay_${tariff.days}`};
        });

        return ctx.safeReply(
            ctx => ctx.editMessageText(text, menu(buttons, 1)),
            ctx => ctx.reply(text, menu(buttons, 1)),
            ctx
        );
    });

    scene.action(/pay_(.*)/, async ctx => {
        try {
            let days = parseInt(ctx.match[1]);
            let userId = ctx.session.userId;
            let needsPayment = await payment.needsPaymentToSubscribe(userId, days);

            if (needsPayment) {
                let price = await payment.getPrice(days);
                let paymentUrl = await payment.addPaymentAndGetPaymentUrl(ctx, price, days);
                let text = `После нажатия на кнопку вы будете направлены на страницу для совершения оплаты.

Успешно завершив процесс оплаты вы соглашаетесь на автоматическое продление подписки на следующий период за ${price} руб.

Пожалуйста, используйте кнопку эту оплаты только один раз`
                let buttons = [{text: `Оплатить ${price} руб`, url: paymentUrl}];
                return ctx.safeReply(
                    ctx => ctx.editMessageText(text, menu(buttons)),
                    ctx => ctx.reply(text, menu(buttons)),
                    ctx
                );
            }
            else {
                await payment.subscribeWithoutPayment(userId);
                ctx.reply(`Спасибо за подписку! Дополнительный платеж пока не нужен`);
            }
        }
        catch (e) {
            console.log(e.toString(), e);
            let buttons = [{text: 'Попробовать еще раз', code: 'retry'}];
            return ctx.reply(`При создании платежа возникла ошибка:
${e.toString()}`, menu(buttons));
        }
    });

    scene.action('retry', ctx => ctx.scene.reenter());

    return scene;
}