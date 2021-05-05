const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;

const { menu, escapeHTML } = require('../lib/helpers');

const EMPTY_TEXT = `Похоже тут пока что ничего нет. 

Попробуйте задать другие категории для поиска.`;


function itemMenu(index, ctx) {
    let profile = ctx.session.profile || {};
    let favoriteIds = ctx.profile.getFavoriteIds();

    let categoryIds = ctx.profile.getSelectedCategoryIds();
    let totalItems = ctx.shop.getProductsCount(categoryIds);
    let hasNext = index < totalItems-1;
    let hasPrev = index > 0;
    let item = ctx.shop.getProductAtIndex(index, categoryIds);
    let isFavorite = favoriteIds && favoriteIds.indexOf(item.id) !== -1;
    let hasSubmenu = favoriteIds.length > 0;

    let isDownloadable = item.files && item.files.length > 0;
    let hasAccess = ctx.shop.hasProductAccess(item, profile);

    let actionButton = isDownloadable && hasAccess
        ? {code: 'send_files', text: '📥'}
        : {code: 'buy', text: '💳'};

    let buttons = [];

    buttons.push(hasPrev
        ? {code: 'go_prev', text: '◀' }
        : {code: '_skip', text: '➖' }
    );

    buttons.push(actionButton);
    buttons.push({code: 'favourite', text: isFavorite ? '☑ ⭐' : '⭐'});

    buttons.push(hasNext
        ? {code: 'go_next', text: '▶' }
        : {code: '_skip', text: '➖' }
    );

    buttons.push(totalItems > 1
        ? {code: 'random', text: '🎲'}
        : {code: '_skip', text: '➖'}
    );

    buttons.push(hasSubmenu
        ? {code: 'menu', text: '↩'}
        : {code: '_skip', text: '➖' }
    );

    buttons.push({code: 'settings', text: '🔧'});

    return menu(buttons, 4);
}
function productDescription(product) {
    return escapeHTML(`<b>${product.title}</b>

${product.description || ''}

${product.originalPrice > 0 ? '<b>Оригинальная цена</b>: '+product.originalPrice+'р\n' : ''}<b>Цена</b>: ${product.price}р`);
}

function noItemsMenu() {
    return menu([{code: 'settings', text: '🔧'}, {code: 'menu', text: '↩'}]);
}

async function replyWithProduct(ctx) {
    let currentIndex = ctx.session.index || 0;
    let categoryIds = ctx.profile.getSelectedCategoryIds();
    let product = await ctx.shop.getProductAtIndex(currentIndex, categoryIds);

    let hasResults = product && product.id;
    if (!hasResults) {
        ctx.session.index = 0;
        if (currentIndex === 0) {
            return ctx.replyWithDisposable('replyWithHTML', EMPTY_TEXT, noItemsMenu());
        }
        else {
            return ctx.scene.reenter();
        }
    }

    let image = product.photos && product.photos[0] ? product.photos[0] : false;
    let itemText = productDescription(product);
    let messageMenu = itemMenu(currentIndex, ctx);
    let withPhoto = image && image.src;

    if (withPhoto) {
        let photoExtra = itemMenu(currentIndex, ctx);
        photoExtra.parse_mode = 'html';
        photoExtra.caption = itemText;

        let media = {url: image.src};

        return await ctx.safeReply(
            ctx => ctx.replyWithDisposable('replyWithPhoto', media, photoExtra)
        );

    }
    else {
        return await ctx.safeReply(
            ctx => ctx.replyWithDisposable('replyWithHTML', itemText, messageMenu)
        );
    }
}

module.exports = function () {
    const scene = new BaseScene('discover');

    scene.enter(async ctx => {
        ctx.session.index = ctx.session.index || 0;

        return replyWithProduct(ctx);
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
        let categoryIds = ctx.profile.getSelectedCategoryIds();
        let maxNum = ctx.shop.getProductsCount(categoryIds)-1;
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
        let categoryIds = ctx.profile.getSelectedCategoryIds();
        let maxNum = ctx.shop.getProductsCount(categoryIds)-1;

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

    scene.action('_skip', ctx => {});

    return scene;
}