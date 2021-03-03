const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const { sendMessage } = require('../lib/message');

async function replyWithSceneMessage(ctx, stage) {
    await ctx.funnel.logStage(stage, ctx);

    let chatId = ctx.chat.id;
    let telegram = ctx.telegram;
    return sendMessage(telegram, chatId, stage);
}

module.exports = function () {
    const scene = new BaseScene('stage');

    scene.enter(async ctx => {
        let stage = ctx.scene.state.stage || false;
        if (!stage) {
            stage = ctx.funnel.getStartingStage();
            ctx.scene.state.stage = stage;
        }

        let messages = await replyWithSceneMessage(ctx, stage);
        return messages;
    });

    scene.start(ctx => {
        return ctx.scene.leave();
    });

    scene.on('text', async ctx => {
        let stage = ctx.scene.state.stage;
        let answer = ctx.update.message.text;
        if (stage && stage.needsAnswer && answer) {
            await ctx.funnel.logAnswer(stage, answer, ctx);
            if (stage.nextStage) {
                let nextStage = ctx.funnel.getStageById(stage.nextStage);
                if (nextStage) {
                    ctx.scene.state.stage = nextStage;
                }
            }
        }

        return ctx.scene.reenter();
    });

    scene.action(/goto_(.*)/, async ctx => {
        let nextStageId = ctx.match[1];
        let nextStage = ctx.funnel.getStageById(nextStageId);
        if (nextStage) {
            ctx.scene.state.stage = nextStage;
        }

        return ctx.scene.reenter();
    });

    return scene;
}