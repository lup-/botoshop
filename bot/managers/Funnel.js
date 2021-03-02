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

        return db.collection('stageLogs').insertOne({
            date: moment().unix(),
            userId,
            chatId,
            stageId: stage.id,
            funnelId: stage.funnelId,
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