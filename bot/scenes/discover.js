const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;

const { menu, menuWithPayment, escapeHTML } = require('../lib/helpers');
const shortid = require('shortid');

const EMPTY_TEXT = `Похоже тут пока что ничего нет. 

Попробуйте задать другие категории для поиска.`;


async function itemMenu(index, ctx, isInvoice = false) {
    let profile = ctx.session.profile || {};
    let favoriteIds = ctx.profile.getFavoriteIds();

    let totalItems = getProductsCount(ctx);
    let hasNext = index < totalItems-1;
    let hasPrev = index > 0;
    let item = await getProductAtIndex(ctx, index);
    let totalPrice = item.price;
    if (item.shippingPrice > 0) {
        totalPrice += item.shippingPrice;
    }
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

    if (!isInvoice) {
        buttons.push(actionButton);
    }

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

    return menuWithPayment(`Купить за ${totalPrice} руб`, buttons, isInvoice ? 3 : 4);
}
function productDescription(product) {
    return escapeHTML(`<b>${product.title}</b>

${product.description || ''}

${product.originalPrice > 0 ? '<b>Оригинальная цена</b>: '+product.originalPrice+'р\n' : ''}<b>Цена</b>: ${product.price}р`);
}

function noItemsMenu() {
    return menu([{code: 'settings', text: '🔧'}, {code: 'menu', text: '↩'}]);
}

async function getProductAtIndex(ctx, currentIndex) {
    let catalogType = ctx.scene.state.type || null;

    if (catalogType === 'favorite') {
        return ctx.profile.getFavoriteIndex(currentIndex);
    }
    else {
        let categoryIds = ctx.profile.getSelectedCategoryIds();
        return ctx.shop.getProductAtIndex(currentIndex, categoryIds);
    }
}

function getProductsCount(ctx) {
    let catalogType = ctx.scene.state.type || null;

    if (catalogType === 'favorite') {
        let favorite = ctx.profile.getFavoriteIds();
        return favorite.length;
    }
    else {
        let categoryIds = ctx.profile.getSelectedCategoryIds();
        let count = ctx.shop.getProductsCount(categoryIds);
        return count;
    }
}

async function replyWithProduct(ctx) {
    let currentIndex = ctx.session.index || 0;
    let product = await getProductAtIndex(ctx, currentIndex);

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
    let messageMenu = await itemMenu(currentIndex, ctx);
    let withPhoto = image && image.src;

    if (withPhoto) {
        let photoExtra = await itemMenu(currentIndex, ctx);
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
async function replyWithInvoice(ctx) {
    let currentIndex = ctx.session.index || 0;
    let product = await getProductAtIndex(ctx, currentIndex);

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
    let messageMenu = await itemMenu(currentIndex, ctx, true);

    let invoice = {
        title: product.title,
        description: escapeHTML(product.description),
        payload: product.id,
        provider_token: ctx.shop.getProviderToken(),
        currency: 'RUB',
        need_name: ctx.shop.getSetting('needName') || false,
        need_phone_number: ctx.shop.getSetting('needPhone') || false,
        need_email: ctx.shop.getSetting('needEmail') || false,
        need_shipping_address: product.needsShipping || false,
        prices: [
            {label: 'Товар', amount: product.price*100}
        ],
    }

    if (product.needsShipping) {
        let shippingPrice = product.shippingPrice || 0;
        invoice.prices.unshift({label: 'Доставка', amount: shippingPrice * 100});
    }

    if (image && image.src) {
        invoice.photo_url = image.src;
    }

    return await ctx.safeReply(
        ctx => ctx.replyWithDisposable('replyWithInvoice', invoice, messageMenu)
    );
}


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

    scene.action('_skip', ctx => {});

    return scene;
}