const {getDb} = require('../modules/Database');

const COLLECTION_NAME = 'profiles';
const ITEMS_NAME = 'profiles';

module.exports = {
    async list(ctx) {
        let filter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};
        let limit = ctx.request.body && typeof (ctx.request.body.limit) !== "undefined"
            ? parseInt(ctx.request.body.limit)
            : 20;

        let defaultFilter = {
            'deleted': {$in: [null, false]}
        };

        filter = Object.assign(defaultFilter, filter);

        let db = await getDb();
        let items = await db.collection(COLLECTION_NAME).find(filter).limit(limit).toArray();
        let response = {};
        response[ITEMS_NAME] = items;

        ctx.body = response;
    },
}