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

        let message = ctx.update.message;
        let {from, chat} = message;
        let id = from.id || chat.id || false;
        let botId = ctx.botInfo.id;

        if (!id) {
            return next();
        }

        const db = await getDb();
        const users = db.collection('users');

        try {
            let user = await users.findOne({id, botId});
            if (user) {
                user.user = from;
                user.chat = chat;
                user.botId = botId;
                user.updated = moment().unix();
                if (user.blocked) {
                    user.blocked = null;
                }
            } else {
                user = {id, botId, user: from, chat, registered: moment().unix(), updated: moment().unix()};
            }

            await users.findOneAndReplace({id, botId}, user, {upsert: true, returnOriginal: false});
        }
        finally {
        }

        return next();
    }
}