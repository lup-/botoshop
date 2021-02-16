const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const {menu} = require('../lib/helpers');

module.exports = function ({payment}) {
    const scene = new BaseScene('subscribe');

    scene.enter(async ctx => {
        let price = await payment.getPrice();
        let text = `Стоимость подписки на сигналы ${price} рублей в месяц. Плата будет сниматься автоматически, пока оформлена подписка.`
        let buttons = [{text: 'Да, согласен на пописку', code: 'agree'}];

        return ctx.safeReply(
            ctx => ctx.editMessageText(text, menu(buttons)),
            ctx => ctx.reply(text, menu(buttons)),
            ctx
        );
    });

    scene.action('agree', async ctx => {
        try {
            let userId = ctx.session.userId;
            let needsPayment = await payment.needsPaymentToSubscribe(userId);

            if (needsPayment) {
                let price = await payment.getPrice();
                let paymentUrl = await payment.addPaymentAndGetPaymentUrl(ctx, price);
                let text = `После нажатия на кнопку вы будете направлены на страницу для совершения оплаты.
    Успешно завершив процесс оплаты вы соглашаетесь на автоматическое продление подписки за ${price} руб/месяц.
        
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