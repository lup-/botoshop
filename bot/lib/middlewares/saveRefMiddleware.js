const {getDb} = require('../database');
const {isStartCommand} = require('../helpers');
const moment = require('moment');

module.exports = function () {
    return async (ctx, next) => {
        if (ctx.chat.type !== 'private') {
            return next();
        }

        if (!isStartCommand(ctx)) {
            return next();
        }

        let ref = ctx.update.message.text.indexOf(' ') !== -1
            ? ctx.update.message.text.replace('/start ', '')
            : false;
        let message = ctx.update.message;
        let userId = message && message.from
            ? message.from.id
            : false;

        let hasRef = userId && ref;
        let subref = false;

        if (!hasRef) {
            return next();
        }

        let hasSubrefs = ref.indexOf('=') !== -1;
        if (hasSubrefs) {
            let parts = ref.split('=');
            ref = parts.shift();
            subref = parts.join('=');
        }

        const db = await getDb();
        const refs = db.collection('refs');

        let refId = `${userId}:${ref}`;

        let refFields = {
            refId,
            userId,
            ref,
            date: moment().unix(),
        }

        if (subref) {
            refFields.subref = subref;
        }

        try {
            await refs.findOneAndReplace({refId}, refFields, {upsert: true, returnOriginal: false});
        }
        finally {
        }

        return next();
    }
}