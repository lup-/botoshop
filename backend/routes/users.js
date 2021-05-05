const {getDb} = require('../modules/Database');

const COLLECTION_NAME = 'users';
const ITEMS_NAME = 'users';

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
}