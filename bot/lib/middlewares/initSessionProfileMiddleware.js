const {getDb} = require('../database');

async function loadProfileByUserId(userId) {
    const db = await getDb();
    let profile = await db.collection('profiles').findOne({userId});
    return profile;
}

async function initProfile(userId, defaultProfile) {
    let profile = await loadProfileByUserId(userId);
    if (!profile) {
        const db = await getDb();
        let result = await db.collection('profiles').insertOne(defaultProfile);
        profile = result && result.ops && result.ops[0] || defaultProfile;
    }

    return profile;
}

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

        ctx.session.userId = userId;
        ctx.session.chatId = chatInfo.id;

        let defaultProfile = {
            id: userId,
            userId,
            chatId: chatInfo.id,
            firstName: fromInfo.first_name,
            lastName: fromInfo.last_name,
            userName: fromInfo.username,
        }

        if (!ctx.session.profile) {
            ctx.session.profile = await initProfile(userId, defaultProfile);
        }

        return next();
    }
}