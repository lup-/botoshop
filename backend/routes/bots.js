const {getDb} = require('../modules/Database');
const {Telegraf} = require('telegraf');
const shortid = require('shortid');
const moment = require('moment');
const axios = require("axios");

const DB_NAME = 'funnel_bot';
const COLLECTION_NAME = 'bots';
const ITEMS_NAME = 'bots';
const ITEM_NAME = 'bot';
const BOT_HTTP_INTERFACE_URL = process.env.BOT_HTTP_INTERFACE_URL || 'http://bot:3000';

module.exports = {
    async getBotInfo(token) {
        let bot = new Telegraf(token);
        return bot.telegram.getMe();
    },
    async getBotParams(token) {
        let botInfo = await this.getBotInfo(token);
        return {username: botInfo.username, id: botInfo.id};
    },
    async list(ctx) {
        let filter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};

        let defaultFilter = {
            'deleted': {$in: [null, false]}
        };

        filter = Object.assign(defaultFilter, filter);

        let db = await getDb(DB_NAME);
        let items = await db.collection(COLLECTION_NAME).find(filter).toArray();
        let response = {};
        response[ITEMS_NAME] = items;

        ctx.body = response;
    },
    async add(ctx) {
        const db = await getDb(DB_NAME);

        let itemData = ctx.request.body[ITEM_NAME];
        if (itemData._id) {
            let response = {};
            response[ITEM_NAME] = false;
            ctx.body = response;
            return;
        }

        let {username, id} = itemData.token ? await this.getBotParams(itemData.token) : {username: null, id: null};

        itemData = Object.assign(itemData, {
            id: shortid.generate(),
            botId: id,
            username,
            created: moment().unix(),
            updated: moment().unix(),
        });

        let result = await db.collection(COLLECTION_NAME).insertOne(itemData);
        let item = result.ops[0];

        let response = {};
        response[ITEM_NAME] = item;

        try {
            let {data} = await axios.get(BOT_HTTP_INTERFACE_URL + '/sync');
            response.reload = data;
        }
        catch (e) {
            response.reload = {error: e};
        }

        ctx.body = response;
    },
    async update(ctx) {
        let db = await getDb(DB_NAME);
        let itemData = ctx.request.body[ITEM_NAME];
        let id = itemData.id;

        if (!id) {
            let response = {};
            response[ITEM_NAME] = false;
            ctx.body = response;
            return;
        }

        if (itemData._id) {
            delete itemData._id;
        }

        if (itemData.token) {
            let {username, id} = itemData.token ? await this.getBotParams(itemData.token) : {username: null, id: null};
            itemData.username = username;
            itemData.botId = id;
        }
        else {
            itemData.username = null;
            itemData.botId = null;
        }

        await db.collection(COLLECTION_NAME).findOneAndReplace({id}, itemData);
        await db.collection(COLLECTION_NAME).updateOne({id}, {$set: {updated: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
    async delete(ctx) {
        const db = await getDb(DB_NAME);
        let itemData = ctx.request.body[ITEM_NAME];
        let id = itemData.id;

        await db.collection(COLLECTION_NAME).findOneAndUpdate({id}, {$set: {deleted: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
}