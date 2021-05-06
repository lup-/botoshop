const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const Payment = require('../managers/Payment');

const { menu } = require('../lib/helpers');

module.exports = function () {
    const scene = new BaseScene('payment');
    const payment = new Payment();

    scene.enter(async ctx => {
        let item = ctx.scene.state.item;
        let hasPrice = item && item.price && item.price > 0;

        if (!hasPrice) {
            return ctx.scene.enter('discover');
        }

        //let newPayment = await payment.addPaymentAndSaveToDb(ctx, item);
        let newPayment = await payment.addTgPaymentAndSaveToDb(ctx, item);
        let text = `После нажатия на кнопку вы будете направлены на страницу для совершения оплаты.

Пожалуйста, используйте кнопку эту оплаты только один раз и дождитесь сообщения о статусе оплаты`
        let buttons = [{text: `Оплатить ${item.price} руб`, url: newPayment.paymentUrl}, {text: 'Назад', code: `cancel_${newPayment.id}`}];
        return await ctx.replyWithDisposable('replyWithHTML', text, menu(buttons));
    });

    scene.action(/cancel_(.*)/ , async ctx => {
        let paymentId = ctx.match[1];
        try {
            await payment.cancelPayment(paymentId, true);
        }
        catch (e) {
            console.log(e);
        }

        return ctx.scene.enter('discover');
    });

    return scene;
}