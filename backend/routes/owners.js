const shortid = require('shortid');
const crypto = require('crypto');
const moment = require('moment');
const {getDb} = require('../modules/Database');
const {getInfoByShop} = require('../modules/BotInfo');

function md5(string) {
    return crypto.createHash('md5').update(string).digest("hex");
}

module.exports = {
    async add(ctx) {
        let db = await getDb();
        let userData = ctx.request.body.owner;

        userData.id = shortid.generate();
        userData.registered = moment().unix();
        userData.passwordHash = md5(userData.password);
        delete userData.password;

        let result = await db.collection('shopOwners').insertOne(userData);
        let owner = result.ops[0];

        ctx.body = { owner };
    },
    async update(ctx) {
        let db = await getDb();
        let ownerData = ctx.request.body.owner;
        let id = ownerData.id;

        if (!id) {
            ctx.body = { owner: false };
            return;
        }

        if (ownerData._id) {
            delete ownerData._id;
        }

        if (ownerData.password) {
            ownerData.passwordHash = md5(ownerData.password);
            delete ownerData.password;
        }

        let updateResult = await db.collection('shopOwners').findOneAndReplace({id, deleted: {$in: [null, false]}}, ownerData, {returnOriginal: false});
        let owner = updateResult.value || false;

        ctx.body = { owner };
    },
    async login(ctx) {
        let login = ctx.request.body.login;
        let passwordHash = md5(ctx.request.body.password);

        let db = await getDb();
        let owner = await db.collection('shopOwners').findOne({login, passwordHash, deleted: {$in: [null, false]}});
        let shop = {};
        let bot = null;
        let isLoaded = Boolean(owner);

        if (isLoaded) {
            delete owner.passwordHash;
            shop = await db.collection('shops').findOne({ ownerId: owner.id, deleted: {$in: [null, false]} });
            if (shop) {
                bot = await getInfoByShop(shop);
            }
        }

        ctx.body = {
            owner,
            shop,
            bot,
            error: isLoaded ? false : 'Логин или пароль не подходят',
        };
    },
    async check(ctx) {
        let id = ctx.request.body.id;

        let db = await getDb();
        let owner = await db.collection('shopOwners').findOne({ id, deleted: {$in: [null, false]} });
        let shop = await db.collection('shops').findOne({ ownerId: owner.id, deleted: {$in: [null, false]} });
        let bot = null;
        if (shop) {
            bot = await getInfoByShop(shop);
        }

        ctx.body = {success: Boolean(owner), owner, shop, bot};
    },
    async delete(ctx) {
        let userData = ctx.request.body.owner;
        let id = userData.id;

        let db = await getDb();
        let deleted = moment().unix();
        let updateResult = await db.collection('shopOwners').findOneAndUpdate({id}, {$set: {deleted}}, {returnOriginal: false});
        let owner = updateResult.value || false;

        ctx.body = { owner };
    },
    async register(ctx) {
        let login = ctx.request.body.login;
        let passwordHash = md5(ctx.request.body.password);
        let fullName = ctx.request.body.name;
        let [firstName, familyName] = fullName.split(' ');

        let emailHash = md5( login.toLowerCase() );
        let gravatarUrl = "https://www.gravatar.com/avatar/"+emailHash+".jpg?d=identicon";

        let ownerData = {
            id : shortid.generate(),
            registered: moment().unix(),
            fullName,
            firstName,
            familyName,
            imageUrl: gravatarUrl,
            login,
            passwordHash,
        };

        let db = await getDb();
        let existingUser = await db.collection('shopOwners').findOne({ login });
        if (existingUser) {
            ctx.body = {
                owner: false,
                shop: {},
                error: 'Пользователь с такой электропочтой уже зарегистрирован'
            };
        }
        else {
            let insertResult = await db.collection('shopOwners').insertOne(ownerData);
            let ownerRecord = insertResult.ops[0] || false;
            delete ownerRecord.passwordHash;

            let shopData = {
                id: shortid(),
                ownerId: ownerRecord.id,
            }

            let shopResult = await db.collection('shops').insertOne(shopData);
            let shop = shopResult.ops[0] || false;
            let bot = null;
            if (shop) {
                bot = await getInfoByShop(shop);
            }

            ctx.body = {
                owner: ownerRecord,
                shop,
                bot,
                error: false
            };
        }
    }
}