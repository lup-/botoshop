const {getDb} = require('../modules/Database');

const COLLECTION_NAME = 'profiles';
const ITEMS_NAME = 'subscribers';

module.exports = {
    async list(ctx) {
        let filter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};

        let defaultFilter = {
            'deleted': {$in: [null, false]}
        };

        filter = Object.assign(defaultFilter, filter);

        let db = await getDb();
        let items = await db.collection(COLLECTION_NAME).find(filter).toArray();
        let response = {};
        response[ITEMS_NAME] = items;

        ctx.body = response;
    },
    async update(ctx) {
        let db = await getDb();
        let subscriberData = ctx.request.body.subscriber;
        let id = subscriberData.id;

        if (!id) {
            ctx.body = { subscriber: false };
            return;
        }

        if (subscriberData._id) {
            delete subscriberData._id;
        }

        let updateResult = await db.collection(COLLECTION_NAME).findOneAndReplace({id}, subscriberData, {returnOriginal: false});
        let subscriber = updateResult.value || false;

        ctx.body = { subscriber };
    },
}