const {getDb} = require('../modules/Database');

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
        let allMailings = db.collection('mailings');

        let mailings = await allMailings.find(filter).toArray();
        ctx.body = {mailings};
    },
}