const {getDb} = require('../modules/Database');
const moment = require('moment');
const {getInfoByShop} = require("../modules/BotInfo");
const {restartBot} = require('../modules/BotHttp');


const COLLECTION_NAME = 'shops';
const ITEM_NAME = 'shop';

module.exports = {
    async update(ctx) {
        let db = await getDb();
        let itemData = ctx.request.body;
        let id = itemData.id;

        if (!id) {
            let response = {};
            response[ITEM_NAME] = false;
            ctx.body = response;
            return;
        }

        if (itemData._id) {
            delete itemData._id;
        }

        await db.collection(COLLECTION_NAME).findOneAndReplace({id}, itemData);
        await db.collection(COLLECTION_NAME).updateOne({id}, {$set: {updated: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id});
        let bot = null;

        if (item) {
            bot = await getInfoByShop(item);
        }

        let response = {};
        response[ITEM_NAME] = item;
        response.bot = bot;

        let restart = await restartBot(item);
        response.restart = restart;

        ctx.body = response;
    }
}