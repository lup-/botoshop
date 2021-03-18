module.exports = function () {
    return async (ctx, next) => {
        let isPrivate = ctx.chat && ctx.chat.type === 'private';
        if (!isPrivate) {
            return next();
        }

        let hasSession = ctx && ctx.session;
        let hasIds = hasSession && ctx.session.userId && ctx.session.chatId;
        let hasChat = ctx && ctx.chat;
        let hasUser = ctx && ctx.from;

        if (!hasSession || hasIds) {
            return next();
        }

        if (hasChat) {
            ctx.session.chatId = ctx.chat.id;
        }

        if (hasUser) {
            ctx.session.userId = ctx.from.id;
        }

        ctx.session.botId = ctx.botInfo.id;

        return next();
    }
}