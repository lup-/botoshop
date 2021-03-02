const {getDb} = require('../modules/Database');
const shortid = require('shortid');
const moment = require('moment');

const DB_NAME = 'funnel_bot';
const COLLECTION_NAME = 'stages';
const ITEMS_NAME = 'stages';
const ITEM_NAME = 'stage';

module.exports = {
    async list(ctx) {
        let funnelId = ctx.params.id;
        let filter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};

        let defaultFilter = {
            funnelId,
            'deleted': {$in: [null, false]}
        };

        filter = Object.assign(defaultFilter, filter);

        let db = await getDb(DB_NAME);
        let items = await db.collection(COLLECTION_NAME).find(filter).toArray();
        let stats = await db.collection('stageLogs').aggregate([
            { $match: {funnelId: funnelId} },
            { $group: {"_id": "$stageId", shows: {$sum: 1}} }
        ]).toArray();

        items = items.map(stage => {
            let stat = stats.find(stat => stat._id === stage.id);
            let shows = stat ? stat.shows : 0;
            stage.shows = shows;
            return stage;
        });

        let response = {};
        response[ITEMS_NAME] = items;

        ctx.body = response;
    },
    async disablePreviousStartingStages(funnelId) {
        const db = await getDb(DB_NAME);
        return db.collection(COLLECTION_NAME).updateMany({funnelId}, {$set: {isStarting: false}}, {returnOriginal: false});
    },

    async add(ctx) {
        let funnelId = ctx.params.id;
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
            funnelId
        });

        if (itemData.isStarting) {
            await this.disablePreviousStartingStages(funnelId);
        }

        let result = await db.collection(COLLECTION_NAME).insertOne(itemData);
        let item = result.ops[0];
        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
    async update(ctx) {
        let funnelId = ctx.params.id;
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

        if (itemData.isStarting) {
            await this.disablePreviousStartingStages(funnelId);
        }

        await db.collection(COLLECTION_NAME).findOneAndReplace({id, funnelId}, itemData);
        await db.collection(COLLECTION_NAME).updateOne({id, funnelId}, {$set: {updated: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id, funnelId});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
    async delete(ctx) {
        let funnelId = ctx.params.id;
        const db = await getDb(DB_NAME);
        let itemData = ctx.request.body[ITEM_NAME];
        let id = itemData.id;

        await db.collection(COLLECTION_NAME).findOneAndUpdate({id, funnelId}, {$set: {deleted: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id, funnelId});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
}