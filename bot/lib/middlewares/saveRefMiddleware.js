const {getDb} = require('../database');
const {isStartCommand} = require('../helpers');
const moment = require('moment');

module.exports = function () {
    return async (ctx, next) => {
        let isPrivate = ctx.chat && ctx.chat.type === 'private';
        if (!isPrivate) {
            return next();
        }

        if (!isStartCommand(ctx)) {
            return next();
        }

        let ref = ctx.update.message.text.indexOf(' ') !== -1
            ? ctx.update.message.text.replace('/start ', '')
            : false;
        let message = ctx.update.message;
        let botId = ctx.botInfo.id;
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

        let refId = `${botId}:${userId}:${ref}`;

        let refFields = {
            refId,
            userId,
            botId,
            ref,
            date: moment().unix(),
        }

        if (subref) {
            refFields.subref = subref;
        }

        if (!ctx.session.ref) {
            ctx.session.ref = refFields;
        }

        try {
            await refs.findOneAndReplace({refId}, refFields, {upsert: true, returnOriginal: false});
        }
        finally {
        }

        return next();
    }
}