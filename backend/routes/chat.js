const {Telegraf} = require('telegraf');
const {getDb} = require('../modules/Database');
const moment = require('moment');

const API_ROOT = process.env.TGAPI_ROOT || 'https://api.telegram.org'

module.exports = {
    async load(ctx) {
        const id = ctx.params.id;
        const botId = ctx.params.botId;

        if (!id) {
            ctx.body = {chat: false};
            return;
        }

        const db = await getDb();
        let chat = await db.collection('chats').findOne({id, botId});

        if (!chat) {
            ctx.body = {chat: false};
            return;
        }

        ctx.body = {chat};
    },
    async list(ctx) {
        let filter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};
        let defaultFilter = {
            deleted: {$in: [null, false]},
        };

        const db = await getDb();
        filter = Object.assign(defaultFilter, filter);
        let chats = await db.collection('chats').find(filter).toArray();

        ctx.body = {chats};
    },
    async listUnread(ctx) {
        const db = await getDb();
        let chats = await db.collection('chats').aggregate([
            { $match: {unread: true, deleted: {$in: [null, false]}} },
            { $lookup: {
                    from: "messages",
                    localField: "id",
                    foreignField: "chatId",
                    as: "unreadMessages"
                }
            },
            { $set: {
                    unreadMessages: {
                        $filter: {input: "$unreadMessages", as: "message", cond: {$gte: ["$$message.received", "$lastRead"]}}
                    }
                }
            }
        ]).toArray();

        ctx.body = {chats};
    },
    async delete(ctx, next) {
        const id = ctx.request.body.id;
        const botId = ctx.request.body.botId;

        if (!id) {
            ctx.body = {chat: false};
            return next();
        }

        const db = await getDb();
        await db.collection('chats').updateOne({botId}, {$set: {deleted: moment().unix()}}, {returnOriginal: false});
        let chat = await db.collection('chats').findOne({id, botId});

        ctx.body = {chat};
    },
    async markRead(ctx) {
        const id = ctx.request.body.id;
        const botId = ctx.request.body.botId;

        if (!id) {
            ctx.body = {chat: false};
            return;
        }

        const db = await getDb();
        await db.collection('chats').updateOne({id, botId}, {$set: {unread: false, lastRead: moment().unix()}}, {returnOriginal: false});
        let chat = await db.collection('chats').findOne({id});

        ctx.body = {chat};
    },
    async history(ctx) {
        const chatId = ctx.request.body.id;
        const botId = ctx.request.body.botId;

        const db = await getDb();
        let history = await db.collection('messages').find({
            chatId,
            botId,
            deleted: {$in: [null, false]},
        }).toArray();

        ctx.body = {history};
    },
    async reply(ctx) {
        const chatId = ctx.request.body.id;
        const botId = ctx.request.body.botId;
        const funnelId = ctx.request.body.funnelId;
        const text =  ctx.request.body.text;
        const newChat = ctx.request.body.newChat || false;

        if (!chatId || !text) {
            ctx.body = {sent: false};
            return;
        }

        const db = await getDb();
        let bot = await db.collection('bots').findOne({botId});
        let token = bot.token;
        let telegram = new Telegraf(token, {telegram: {apiRoot: API_ROOT}}).telegram;

        if (newChat) {
            let chat = {id: chatId, botId, user: newChat.user, chat: newChat.chat, startedByBot: true};

            await db.collection('chats').updateOne({id: chatId, botId}, {
                $set: {unread: true, lastMessage: moment().unix()},
                $setOnInsert: chat,
            }, {upsert: true, returnOriginal: false});
        }

        let message;
        let error;

        try {
            message = await telegram.sendMessage(chatId, text);
            let messageId = message.message_id;
            let saveMessage = {chatId, botId, funnelId, replied: moment().unix()}

            await db.collection('messages').updateOne({botId, messageId}, {
                $set: {message},
                $setOnInsert: saveMessage
            }, {upsert: true, returnOriginal: false});

            await db.collection('chats').updateOne({id: chatId, botId}, {$set: {lastRead: moment().unix()}});
        }
        catch (e) {
            sent = false;
            error = e;
        }


        let history = await db.collection('messages').find({
            chatId,
            botId,
            deleted: {$in: [null, false]},
        }).toArray();

        ctx.body = {sent: message, error, history};
    }
}