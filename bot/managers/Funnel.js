const {getDb} = require('../lib/database');
const moment = require('moment');

module.exports = class Funnel {
    constructor(funnelId) {
        this.funnelId = funnelId;
        this.funnel = null;
        this.stages = [];
    }

    async init() {
        await this.loadFunnel();
        await this.loadStages();
    }

    getId() {
        return this.funnelId;
    }

    async loadFunnel() {
        let db = await getDb();
        this.funnel = await db.collection('funnels').findOne({id: this.funnelId});
    }

    async loadStages() {
        let db = await getDb();
        this.stages = await db.collection('stages').find({funnelId: this.funnelId}).toArray();
    }

    getStageById(stageId) {
        return this.stages.find(stage => stage.id === stageId);
    }

    getStartingStage() {
        let startingStage = this.stages.find(stage => stage.isStarting === true);
        if (!startingStage) {
            startingStage = this.stages[0];
        }

        return startingStage;
    }

    async logStage(stage, ctx) {
        let db = await getDb();
        let {userId, chatId} = ctx.session;

        return db.collection('funnelActivity').insertOne({
            date: moment().unix(),
            type: 'stage',
            userId,
            chatId,
            stageId: stage.id,
            funnelId: stage.funnelId,
        });
    }

    async logButton(buttonId, ctx, funnelId = null, mailingId = null) {
        let db = await getDb();
        let {userId, chatId} = ctx.session;
        let srcStageId = null;
        let dstStageId = null;
        let index;
        let isStageButton = buttonId.indexOf('stage:') === 0;

        if (isStageButton) {
            [ ,srcStageId, dstStageId, index] = buttonId.split(':');
        }
        else {
            [, mailingId, index] = buttonId.split(':');
        }

        return db.collection('funnelActivity').insertOne({
            date: moment().unix(),
            type: 'button',
            userId,
            chatId,
            index,
            srcStageId,
            dstStageId,
            funnelId,
            mailingId
        });
    }

    async logAnswer(stage, answer, ctx) {
        let db = await getDb();
        let {userId, chatId} = ctx.session;

        return db.collection('stageAnswers').insertOne({
            date: moment().unix(),
            userId,
            chatId,
            answer,
            stageId: stage.id,
            funnelId: stage.funnelId,
        });
    }

    async saveMessage(ctx) {
        const db = await getDb();
        const message = ctx.update.message;
        const messageId = message.message_id;
        const chatId = message.chat_id || ctx.chat.id;
        const funnelId = ctx.funnel.getId();
        const botId = ctx.botInfo.id;
        const stageId = ctx.scene && ctx.scene.state && ctx.scene.state.stage && ctx.scene.state.stage.id;

        let chat = {id: chatId, botId, user: message.from, chat: ctx.chat}
        let saveMessage = {chatId, funnelId, botId, stageId, received: moment().unix()}

        await db.collection('chats').updateOne({id: chatId, botId}, {
            $set: {unread: true, lastMessage: moment().unix()},
            $setOnInsert: chat,
        }, {upsert: true, returnOriginal: false});

        await db.collection('messages').updateOne({botId, messageId}, {
            $set: {message},
            $setOnInsert: saveMessage
        }, {upsert: true, returnOriginal: false});
    }
}