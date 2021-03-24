const {getDb} = require('../modules/Database');
const shortid = require('shortid');
const moment = require('moment');

const DB_NAME = 'funnel_bot';
const COLLECTION_NAME = 'funnels';
const ITEMS_NAME = 'funnels';
const ITEM_NAME = 'funnel';

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
        let items = await db.collection(COLLECTION_NAME).aggregate([
            {$match: filter},
            {$lookup: {
                    from: 'stages',
                    localField: 'id',
                    foreignField: 'funnelId',
                    as: 'stages'
                }
            },
            {$project: {
                    "stages.photos": 0,
                }
            }
        ]).toArray();

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
        });

        let result = await db.collection(COLLECTION_NAME).insertOne(itemData);
        let item = result.ops[0];
        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
    async copy(ctx) {
        let oldFunnelId = ctx.request.body[ITEM_NAME].id;
        let db = await getDb(DB_NAME);
        let oldFunnel = await db.collection('funnels').findOne({id: oldFunnelId});
        let oldStages = await db.collection('stages').find({funnelId: oldFunnelId, deleted: {$in: [null, false]}}).toArray();

        let newFunnelId = shortid.generate();
        let newFunnel = Object.assign(oldFunnel, {
            id: newFunnelId,
            created: moment().unix(),
            updated: moment().unix(),
        });

        delete newFunnel._id;
        delete newFunnel.finished;
        newFunnel.title = newFunnel.title + ' (копия)';

        let newStages = oldStages.map(oldStage => {
            let newStage = Object.assign(oldStage, {
                id: shortid(),
                copyOf: oldStage.id,
                funnelId: newFunnelId,
                created: moment().unix(),
                updated: moment().unix(),
            });

            delete newStage._id;
            delete newStage.shows;

            return newStage;
        });

        newStages = newStages.map(newStage => {
            if (newStage.nextStage) {
                let updatedStage = newStages.find(stage => stage.copyOf === newStage.nextStage);
                newStage.nextStage = updatedStage ? updatedStage.id || false : false;
            }

            if (newStage.buttons && newStage.buttons.length > 0) {
                newStage.buttons = newStage.buttons.map(button => {
                    if (button.type !== 'stage') {
                        return button;
                    }

                    let updatedStage = newStages.find(stage => stage.copyOf === button.target);
                    button.target = updatedStage ? updatedStage.id || false : false;

                    return button;
                });
            }

            return newStage;
        });

        let result = await db.collection('funnels').insertOne(newFunnel);
        await db.collection('stages').insertMany(newStages);

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