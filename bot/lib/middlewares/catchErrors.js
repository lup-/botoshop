const {getDb} = require('../database');
const moment = require('moment');

module.exports = function (blockedHandler = false) {
    return async function (err, ctx) {
        if (ctx.chat.type !== 'private') {
            return;
        }

        let sendError = false;

        try {
            await ctx.reply('Похоже, что-то пошло не по плану.\nПопробуйте начать заново /start.');
        }
        catch (e) {
            sendError = e;
            if (sendError && sendError.code) {
                if (sendError.code === 403) {
                    if (blockedHandler) {
                        return blockedHandler(ctx);
                    }
                    else {
                        return;
                    }
                }
            }
        }

        try {
            let db = await getDb();
            let {from, chat} = ctx;
            let userId = from.id || chat.id || false;
            let errorRecord = {
                date: moment().unix(),
                userId,
                error: err.toString(),
                stack: err.stack || false,
                sendError: sendError.toString()
            }

            await db.collection('errors').insertOne(errorRecord);
        }
        catch (e) {
        }

        console.log(new Date, err);

        return;
    }
}