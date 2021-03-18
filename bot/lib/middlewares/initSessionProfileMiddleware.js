const Profile = require('../../managers/Profile');

module.exports = function () {
    return async (ctx, next) => {
        let isPrivate = ctx.chat && ctx.chat.type === 'private';
        if (!isPrivate) {
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

        if (profile.botId !== botId) {
            await profile.setFields({botId});
        }

        ctx.profile = profile;

        if (!ctx.session.profile) {
            ctx.session.profile = profile.get();
        }

        return next();
    }
}