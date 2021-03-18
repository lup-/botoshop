const Profile = require('../../managers/Profile');

module.exports = async (ctx, next) => {
    let memberChanged = ctx.update && typeof(ctx.update.my_chat_member) !== 'undefined';
    if (!memberChanged) {
        return next();
    }

    let from = ctx.update.my_chat_member.from;
    let oldMember = ctx.update.my_chat_member.old_chat_member;
    let newMember = ctx.update.my_chat_member.new_chat_member;
    let statusChanged = oldMember && newMember && oldMember.status !== newMember.status;
    if (!statusChanged) {
        return next();
    }

    let profile;
    let hasProfile = typeof (ctx.profile) !== 'undefined';
    if (hasProfile) {
        profile = ctx.profile;
    }
    else {
        let userId = from.id;
        profile = new Profile(userId, ctx, ctx.session.profile);
        await profile.init();
    }

    let userBlockedBot = newMember.status === 'kicked';
    let userUnblockedBot = newMember.status === 'member';
    let otherStatusChange = !userBlockedBot && !userUnblockedBot;
    if (otherStatusChange) {
        return next();
    }

    if (userUnblockedBot) {
        ctx.session.profile = await profile.setUnblocked();
        return next();
    }

    if (userBlockedBot) {
        await profile.setBlocked();
    }
}