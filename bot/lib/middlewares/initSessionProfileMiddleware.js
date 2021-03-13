const Profile = require('../../managers/Profile');

module.exports = function () {
    return async (ctx, next) => {
        if (ctx.chat.type !== 'private') {
            return next();
        }

        if (!ctx.session) {
            return next();
        }

        if (ctx.session.profile) {
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

        ctx.session.userId = userId;
        ctx.session.chatId = chatInfo.id;
        ctx.session.botId = botId;

        let profile = new Profile(userId, ctx, ctx.session.profile);
        await profile.init();

        ctx.profile = profile;
        ctx.session.profile = profile.get();

        return next();
    }
}