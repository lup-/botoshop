const {getDb} = require('../modules/Database');
const shortid = require('shortid');
const moment = require('moment');

const DB_NAME = 'funnel_bot';
const COLLECTION_NAME = 'mailings';
const ITEMS_NAME = 'mailings';
const ITEM_NAME = 'mailing';

module.exports = {
    async list(ctx) {
        let filter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};

        let defaultFilter = {
            'deleted': {$in: [null, false]}
        };

        filter = Object.assign(defaultFilter, filter);

        let db = await getDb(DB_NAME);
        let items = await db.collection(COLLECTION_NAME).find(filter).toArray();
        let response = {};
        response[ITEMS_NAME] = items;

        ctx.body = response;
    },
    async add(ctx) {
        const db = await getDb(DB_NAME);

        let itemData = ctx.request.body[ITEM_NAME];
        if (itemData._id) {
            let response = {};
            response[ITEM_NAME] = false;
            ctx.body = response;
            return;
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
        let db = await getDb(DB_NAME);
        let itemData = ctx.request.body[ITEM_NAME];
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

        if (!itemData.status) {
            itemData.status = 'new';
        }

        await db.collection(COLLECTION_NAME).findOneAndReplace({id}, itemData);
        await db.collection(COLLECTION_NAME).updateOne({id}, {$set: {updated: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
    async delete(ctx) {
        const db = await getDb(DB_NAME);
        let itemData = ctx.request.body[ITEM_NAME];
        let id = itemData.id;

        await db.collection(COLLECTION_NAME).findOneAndUpdate({id}, {$set: {deleted: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
}