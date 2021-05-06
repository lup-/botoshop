const {menu, menuWithPayment, escapeHTML} = require('./helpers');

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

function buyOnlyMenu(item) {
    let totalPrice = item.price;
    if (item.shippingPrice > 0) {
        totalPrice += item.shippingPrice;
    }

    return menuWithPayment(`Купить за ${totalPrice} руб`, []);
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

async function makeInvoice(ctx, product = null) {
    let currentIndex = null;
    let noMenu = true;

    if (!product) {
        currentIndex = ctx.session.index || 0;
        product = await getProductAtIndex(ctx, currentIndex);
        noMenu = false;
    }

    let image = product.photos && product.photos[0] ? product.photos[0] : false;
    let messageMenu = noMenu
        ? buyOnlyMenu(product)
        : await itemMenu(currentIndex, ctx, true);

    let invoice = {
        title: product.title,
        description: escapeHTML(product.description) || '-',
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

    return {invoice, messageMenu};
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

    let {invoice, messageMenu} = await makeInvoice(ctx);

    return await ctx.safeReply(
        ctx => ctx.replyWithDisposable('replyWithInvoice', invoice, messageMenu)
    );
}

module.exports = {replyWithProduct, replyWithInvoice, getProductAtIndex, getProductsCount, itemMenu, productDescription, makeInvoice};