const {getDb} = require('../modules/Database');
const shortid = require('shortid');
const moment = require('moment');

const COLLECTION_NAME = 'orders';
const ITEMS_NAME = 'orders';
const ITEM_NAME = 'order';

module.exports = {
    async list(ctx) {
        let filter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};
        let shopId = ctx.request.body && ctx.request.body.shop && ctx.request.body.shop.id
            ? ctx.request.body.shop.id|| null
            : null;

        let defaultFilter = {
            shopId,
            'status': {$nin: ['finished']},
            'deleted': {$in: [null, false]}
        };

        filter = Object.assign(defaultFilter, filter);

        let db = await getDb();
        let items = await db.collection(COLLECTION_NAME).find(filter).toArray();
        let response = {};
        response[ITEMS_NAME] = items;

        ctx.body = response;
    },
    async updateStatus(ctx) {
        let db = await getDb();
        let itemData = ctx.request.body[ITEM_NAME];
        let id = itemData.id;
        let status = itemData.status;
        let shopId = ctx.request.body.shop ? ctx.request.body.shop.id || null : null;

        if (!id) {
            let response = {};
            response[ITEM_NAME] = false;
            ctx.body = response;
            return;
        }

        if (itemData._id) {
            delete itemData._id;
        }

        await db.collection(COLLECTION_NAME).updateOne({id, shopId}, {$set: {status, updated: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id, shopId});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
    async finish(ctx) {
        const db = await getDb();
        let itemData = ctx.request.body[ITEM_NAME];
        let id = itemData.id;
        let shopId = ctx.request.body.shop ? ctx.request.body.shop.id || null : null;

        await db.collection(COLLECTION_NAME).findOneAndUpdate({id, shopId}, {$set: {status: 'finished', finished: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id, shopId});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    }
}