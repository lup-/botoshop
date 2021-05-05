const Shop = require('../../managers/Shop');

module.exports = function (shop, botManager) {
    return async (ctx, next) => {
        let ctxShop = new Shop(shop, botManager);
        await ctxShop.init();

        ctx.session.shopId = shop.id;
        ctx.shop = ctxShop;
        next();
    }
}