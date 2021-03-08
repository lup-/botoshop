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
}