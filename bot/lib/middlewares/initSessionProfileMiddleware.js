const Profile = require('../../managers/Profile');

module.exports = function () {
    return async (ctx, next) => {
        if (ctx.chat.type !== 'private') {
            return next();
        }

        if (!ctx.session) {
            return next();
        }

        const fromInfo = ctx.update.callback_query
            ? ctx.update.callback_query.from
            : ctx.update.message.from;
        const chatInfo = ctx.update.callback_query
            ? ctx.update.callback_query.message.chat
            : ctx.update.message.chat;

        const userId = fromInfo.id;
        const botId = ctx.botInfo.id;

        if (!ctx.session.profile) {
            ctx.session.userId = userId;
            ctx.session.chatId = chatInfo.id;
            ctx.session.botId = botId;
        }

        let profile = new Profile(userId, ctx, ctx.session.profile);
        await profile.init();

        ctx.profile = profile;

        if (!ctx.session.profile) {
            ctx.session.profile = profile.get();
        }

        return next();
    }
}