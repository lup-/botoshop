const {getDb} = require('../lib/database');
const moment = require('moment');

module.exports = class Profile {
    constructor(userId, ctx, sessionProfile = false) {
        this.userId = userId;
        this.ctx = ctx;
        this.profile = false;
        this.sessionProfile = sessionProfile;
    }

    async load() {
        const db = await getDb();
        this.profile = await db.collection('profiles').findOne({userId: this.userId});
        return this.profile;
    }

    get() {
        return this.profile;
    }

    getDefault() {
        const fromInfo = this.ctx.update.callback_query
            ? this.ctx.update.callback_query.from
            : (this.ctx.update.message ? this.ctx.update.message.from : false);
        const chatInfo = this.ctx.update.callback_query
            ? this.ctx.update.callback_query.message.chat
            : (this.ctx.update.message ? this.ctx.update.message.chat : false);

        if (!fromInfo) {
            return false;
        }

        const botId = this.ctx.botInfo.id;

        let defaultProfile = {
            id: this.userId,
            userId: this.userId,
            chatId: chatInfo.id,
            botId,
            firstName: fromInfo.first_name,
            lastName: fromInfo.last_name,
            userName: fromInfo.username,
        }

        return defaultProfile;
    }

    async init() {
        if (this.sessionProfile) {
            this.profile = this.sessionProfile;
            this.userId = this.profile.userId;
        }
        else {
            await this.load();
            if (!this.profile) {
                const db = await getDb();
                let defaultProfile = this.getDefault();
                if (defaultProfile) {
                    await db.collection('profiles').insertOne();
                    await this.load();
                }
            }
        }

        return this.profile;
    }

    async setPhone(newPhone) {
        this.profile.phone = newPhone;
        const db = await getDb();
        await db.collection('profiles').updateOne({userId: this.userId}, {$set: {phone: newPhone}});
        return this.profile;
    }

    async setEmail(newEmail) {
        this.profile.email = newEmail;
        const db = await getDb();
        await db.collection('profiles').updateOne({userId: this.userId}, {$set: {email: newEmail}});
        return this.profile;
    }

    async setFields(fields) {
        this.profile = Object.assign(this.profile, fields);
        const db = await getDb();
        await db.collection('profiles').updateOne({userId: this.userId}, {$set: fields});
        return this.profile;
    }

    async setFunnelStage(funnelId, stageId) {
        this.profile.funnelId = funnelId;
        this.profile.stageId = stageId;
        let stageTime = moment().unix();

        const db = await getDb();
        await db.collection('profiles').updateOne({userId: this.userId}, {$set: {funnelId, stageId, stageTime}});
        return this.profile;
    }

    setUnblocked() {
        return this.setBlocked(true);
    }

    async setBlocked(unblock = false) {
        let blocked = unblock ? null : moment().unix();

        const db = await getDb();
        await db.collection('users').updateOne({id: this.userId, botId: this.profile.botId}, {$set: {blocked}});
        await db.collection('profiles').updateOne({userId: this.userId, botId: this.profile.botId}, {$set: {blocked}});
        this.profile.blocked = blocked;

        return this.profile;
    }
}
