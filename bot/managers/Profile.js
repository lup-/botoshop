const {getDb} = require('../lib/database');
const moment = require('moment');

module.exports = class Profile {
    constructor(userId, botId, shopId, ctx) {
        this.userId = userId;
        this.botId = botId;
        this.shopId = shopId;
        this.ctx = ctx;
        this.profile = false;
        this.sessionProfile = ctx.session && ctx.session.profile ? ctx.session.profile : false;
        this.shopId = ctx.session && ctx.session.shopId ? ctx.session.shopId : null;
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
        const fromInfo = this.ctx.from || false;
        const chatInfo = this.ctx.chat || false;
        const shopId = this.shopId;

        if (!fromInfo) {
            return false;
        }

        const botId = this.botId;

        let defaultProfile = {
            id: this.userId,
            userId: this.userId,
            chatId: chatInfo.id,
            botId,
            shopId,
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
                    await db.collection('profiles').insertOne(defaultProfile);
                    await this.load();
                }
            }
        }

        return this.profile;
    }

    async setPhone(newPhone) {
        this.profile.phone = newPhone;
        const db = await getDb();
        await db.collection('profiles').updateOne({userId: this.userId, shopId: this.shopId}, {$set: {phone: newPhone}});
        return this.profile;
    }

    async setEmail(newEmail) {
        this.profile.email = newEmail;
        const db = await getDb();
        await db.collection('profiles').updateOne({userId: this.userId, shopId: this.shopId}, {$set: {email: newEmail}});
        return this.profile;
    }

    async setFields(fields) {
        this.profile = Object.assign(this.profile, fields);
        const db = await getDb();
        await db.collection('profiles').updateOne({userId: this.userId, shopId: this.shopId}, {$set: fields});
        return this.profile;
    }

    setUnblocked() {
        return this.setBlocked(true);
    }

    async setBlocked(unblock = false) {
        let blocked = unblock ? null : moment().unix();

        const db = await getDb();
        await db.collection('users').updateOne({id: this.userId, shopId: this.shopId}, {$set: {blocked}});
        await db.collection('profiles').updateOne({userId: this.userId, shopId: this.shopId}, {$set: {blocked}});
        this.profile.blocked = blocked;

        return this.profile;
    }

    syncSession() {
        this.ctx.session.profile = this.profile;
    }

    async saveProfile(profile = null) {
        if (!profile) {
            profile = this.profile;
        }

        const db = await getDb();
        const profiles = db.collection('profiles');

        if (!profile.id) {
            profile.id = shortid.generate();
        }

        if (profile._id) {
            delete profile._id;
        }

        const id = profile.id;
        let updateResult = await profiles.findOneAndReplace({id, shopId: this.shopId}, profile, {upsert: true, returnOriginal: false});
        let savedProfile = updateResult.value || false;

        if (savedProfile) {
            this.profile = savedProfile;
        }

        this.syncSession();
    }

    getFavoriteIds() {
        return this.profile.favorite || [];
    }

    getSelectedCategoryIds() {
        return this.profile.category || [];
    }

    async toggleFavorite(item) {
        if (!this.profile.favorite) {
            this.profile.favorite = [];
        }

        let favIndex = this.profile.favorite.indexOf(item.id);
        if (favIndex === -1) {
            this.profile.favorite.push(item.id)
        }
        else {
            this.profile.favorite.splice(favIndex, 1);
        }

        return this.saveProfile();
    }

    toggleCategory(categoryId) {
        if (!this.profile.category) {
            this.profile.category = [];
        }

        let catIndex = this.profile.category.indexOf(categoryId);
        if (catIndex === -1) {
            this.profile.category.push(categoryId)
        }
        else {
            this.profile.category.splice(catIndex, 1);
        }

        return this.saveProfile();
    }
}
