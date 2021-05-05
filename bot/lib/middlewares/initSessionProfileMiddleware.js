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

        const fromInfo = ctx.from;
        const chatInfo = ctx.chat;

        const userId = fromInfo.id;
        const botId = ctx.botInfo.id;
        const shopId = ctx.shop ? ctx.shop.id : ctx.session.shopId;

        if (!ctx.session.profile) {
            ctx.session.userId = userId;
            ctx.session.chatId = chatInfo.id;
            ctx.session.botId = botId;
        }

        let profile = new Profile(userId, botId, shopId, ctx);
        await profile.init();

        ctx.profile = profile;

        if (!ctx.session.profile) {
            profile.syncSession();
        }

        return next();
    }
}