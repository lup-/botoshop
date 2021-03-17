const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const { sendStageMessage } = require('../lib/message');

async function replyWithSceneMessage(ctx, stage) {
    await ctx.funnel.logStage(stage, ctx);
    await ctx.profile.setFunnelStage(stage.funnelId, stage.id);

    let chatId = ctx.chat.id;
    let botId = ctx.botInfo.id;
    let telegram = ctx.telegram;
    let results = [];

    try {
        results = await sendStageMessage(telegram, chatId, stage, botId);
    }
    catch (e) {
        console.log(e);
    }

    return results;
}

async function scheduleAutoSend(chatId, botId, telegram, stage) {

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

        if (stage && stage.hasTimer === true && stage.timerType === 'seconds') {
            await scheduleAutoSend(ctx.chat.id, ctx.botInfo.id, ctx.telegram, stage);
        }

        return messages;
    });

    scene.start(ctx => {
        ctx.scene.state.stage = ctx.funnel.getStartingStage();
        return ctx.scene.reenter();
    });

    scene.on('text', async ctx => {
        let stage = ctx.scene.state.stage;
        let answer = ctx.update.message.text;
        if (stage && stage.needsAnswer && answer) {
            await ctx.funnel.logAnswer(stage, answer, ctx);
            if (stage.answerIsPhone) {
                ctx.session.profile = ctx.profile.setPhone(answer);
            }

            if (stage.answerIsEmail) {
                ctx.session.profile = ctx.profile.setEmail(answer);
            }

            if (stage.nextStage) {
                let nextStage = ctx.funnel.getStageById(stage.nextStage);
                if (nextStage) {
                    ctx.scene.state.stage = nextStage;
                }
            }

            return ctx.scene.reenter();
        }
        else if (answer) {
            await ctx.funnel.saveMessage(ctx);
        }
    });

    scene.action(/goto\/(.*?)\/(.*)/, async ctx => {
        let buttonId = ctx.match[1];
        let nextStageId = ctx.match[2];

        await ctx.funnel.logButton(buttonId, ctx, ctx.funnel.getId());

        let nextStage = ctx.funnel.getStageById(nextStageId);
        if (nextStage) {
            ctx.scene.state.stage = nextStage;
        }

        return ctx.scene.reenter();
    });

    return scene;
}