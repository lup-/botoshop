const {getDb} = require('../modules/Database');
const shortid = require('shortid');
const moment = require('moment');

const COLLECTION_NAME = 'mailings';
const ITEMS_NAME = 'mailings';
const ITEM_NAME = 'mailing';

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
            'deleted': {$in: [null, false]}
        };

        filter = Object.assign(defaultFilter, filter);

        let db = await getDb();
        let items = await db.collection(COLLECTION_NAME).find(filter).toArray();
        let response = {};
        response[ITEMS_NAME] = items;

        ctx.body = response;
    },
    async add(ctx) {
        const db = await getDb();

        let itemData = ctx.request.body[ITEM_NAME];
        if (itemData._id) {
            let response = {};
            response[ITEM_NAME] = false;
            ctx.body = response;
            return;
        }

        if (itemData.shop) {
            itemData.shopId = itemData.shop.id || null;
            delete itemData.shop;
        }

        itemData = Object.assign(itemData, {
            id: shortid.generate(),
            created: moment().unix(),
            updated: moment().unix(),
            status: 'new',
        });

        let result = await db.collection(COLLECTION_NAME).insertOne(itemData);
        let item = result.ops[0];
        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
    async update(ctx) {
        let db = await getDb();
        let itemData = ctx.request.body[ITEM_NAME];
        let id = itemData.id;
        let shopId = itemData.shop ? itemData.shop.id || null : null;

        if (!id) {
            let response = {};
            response[ITEM_NAME] = false;
            ctx.body = response;
            return;
        }

        if (itemData._id) {
            delete itemData._id;
        }

        if (!itemData.status) {
            itemData.status = 'new';
        }

        await db.collection(COLLECTION_NAME).findOneAndReplace({id, shopId}, itemData);
        await db.collection(COLLECTION_NAME).updateOne({id, shopId}, {$set: {updated: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id, shopId});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
    async delete(ctx) {
        const db = await getDb();
        let itemData = ctx.request.body[ITEM_NAME];
        let id = itemData.id;
        let shopId = itemData.shop ? itemData.shop.id || null : null;

        await db.collection(COLLECTION_NAME).findOneAndUpdate({id, shopId}, {$set: {deleted: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id, shopId});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
}