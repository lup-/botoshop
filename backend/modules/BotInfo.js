const {getDb} = require('./Database');
const {Telegraf} = require('telegraf');

async function getInfoByToken(token) {
    const bot = new Telegraf(token);
    return bot.telegram.getMe();
}

async function getInfoByShopId(shopId) {
    let db = await getDb();
    let shop = await db.collection('shops').findOne({id: shopId});

    return shop ? getInfoByShop(shop) : null;
}

async function getInfoByShop(shop) {
    let settings = shop.settings || {};
    let token = settings.botToken || null;

    if (!token) {
        return null;
    }

    return getInfoByToken(token);
}

module.exports = {
    getInfoByShopId,
    getInfoByShop,
    getInfoByToken
}