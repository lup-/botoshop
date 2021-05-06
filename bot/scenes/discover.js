const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const { replyWithProduct, replyWithInvoice, getProductsCount } = require('../lib/product');

module.exports = function () {
    const scene = new BaseScene('discover');

    scene.enter(async ctx => {
        ctx.session.index = ctx.session.index || 0;
        let isYooKassaMode = ctx.shop.useYooKassa();

        return isYooKassaMode ? replyWithProduct(ctx) : replyWithInvoice(ctx);
    });

    scene.start(ctx => ctx.scene.enter('menu'));
    scene.action('go_prev', ctx => {
        let index = ctx.session.index || 0;
        if (index > 0) {
            index--;
        }

        ctx.session.index = index;
        ctx.session.nav = true;
        return ctx.scene.reenter();
    });

    scene.action('go_next', ctx => {
        let maxNum = getProductsCount(ctx)-1;
        let index = ctx.session.index || 0;
        let hasNext = index < maxNum;

        if (hasNext) {
            index++;
        }

        ctx.session.index = index;
        ctx.session.nav = true;
        return ctx.scene.reenter();
    });

    scene.action('random', ctx => {
        let maxNum = getProductsCount(ctx)-1;

        let index = ctx.session.index || 0;
        let randomIndex = false;
        let retries = 0;
        let maxRetries = 5;

        do {
            retries++;
            randomIndex = maxNum
                ? Math.floor(Math.random() * maxNum)
                : 0;
        }
        while (maxNum > 0 && index === randomIndex && retries < maxRetries)

        return ctx.scene.reenter();
    });

    scene.action('settings', ctx => {
        ctx.session.index = 0;
        return ctx.scene.enter('settings');
    });

    scene.action('menu', ctx => {
        ctx.session.index = 0;
        return ctx.scene.enter('menu');
    });

    scene.action('favourite', async ctx => {
        let currentIndex = ctx.session.index || 0;
        let categoryIds = ctx.profile.getSelectedCategoryIds();
        let item = await ctx.shop.getProductAtIndex(currentIndex, categoryIds);

        await ctx.profile.toggleFavorite(item);
        return ctx.scene.reenter();
    });

    scene.action('send_files', async ctx => {
        let currentIndex = ctx.session.index || 0;
        let chatId = ctx.from.id;
        await ctx.shop.sendFiles(ctx.telegram, chatId, ctx.botInfo.id, currentIndex);
        return ctx.scene.reenter();
    });

    scene.action('buy', async ctx => {
        let currentIndex = ctx.session.index || 0;
        let categoryIds = ctx.profile.getSelectedCategoryIds();
        let item = ctx.shop.getProductAtIndex(currentIndex, categoryIds);
        return ctx.scene.enter('payment', {item});
    });

    scene.action('_skip', ctx => ctx.scene.reenter());

    return scene;
}