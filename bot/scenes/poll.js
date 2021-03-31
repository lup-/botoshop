const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const { sendStageMessage } = require('../lib/message');

async function answerWithQuestion(ctx, poll, nextStepIndex) {
    let hasNextQuestion = poll.questions[nextStepIndex] || false;
    if (hasNextQuestion) {
        ctx.scene.state.questionIndex = nextStepIndex;
        return ctx.scene.reenter();
    }
    else {
        let currentStage = ctx.scene.state.stage;
        let poll = ctx.scene.state.poll;
        let answers = ctx.scene.state.answers;
        let nextStageId = currentStage.nextStage;
        let totalScore = ctx.scene.state.totalScore || 0;

        await ctx.funnel.logPoll(ctx, currentStage, poll, answers, totalScore);

        let nextStage = ctx.funnel.getStageById(nextStageId);
        return ctx.scene.enter('stage', {stage: nextStage});
    }
}

module.exports = function () {
    const scene = new BaseScene('poll');

    scene.enter(async ctx => {
        let poll = ctx.scene.state.poll || false;
        let stage = ctx.scene.state.stage || false;
        let questionIndex = typeof (ctx.scene.state.questionIndex) === 'number'
            ? ctx.scene.state.questionIndex
            : false;
        let startWithBeginning = questionIndex === false;

        if (!poll || !stage) {
            return;
        }

        let chatId = ctx.chat.id;
        let botId = ctx.botInfo.id;
        let telegram = ctx.telegram;

        if (startWithBeginning) {
            let pollStartMessage = {
                id: stage.id,
                text: poll.text,
                buttons: [
                    {text: poll.buttonText, type: 'poll', answerIndex: 0, nextStepIndex: 0}
                ]
            }

            return sendStageMessage(telegram, chatId, pollStartMessage, botId);
        }
        else {
            let question = poll.questions[questionIndex];
            let questionMessage = {
                id: stage.id,
                text: question.text
            };

            if (!question.isOpen) {
                questionMessage.buttons = question.answers.map((answer, index) => {
                    return {
                        text: answer.text,
                        type: 'poll',
                        answerIndex: index,
                        nextStepIndex: questionIndex+1,
                    }
                });
            }

            return sendStageMessage(telegram, chatId, questionMessage, botId);
        }

    });

    scene.start(ctx => {
        ctx.scene.state.questionIndex = false;
        return ctx.scene.reenter();
    });

    scene.on('text', async ctx => {
        let answer = ctx.update.message.text;
        let questionIndex = ctx.scene.state.questionIndex || 0;
        let nextStepIndex = questionIndex + 1;
        let poll = ctx.scene.state.poll;
        let currentQuestion = poll.questions[questionIndex];
        ctx.scene.state.answers.push({
            answerIndex: null,
            question: currentQuestion.text,
            answer,
        });

        return answerWithQuestion(ctx, poll, nextStepIndex);
    });

    scene.action(/poll\/(.*?)\/(.*)/, async ctx => {
        let answerIndex = parseInt(ctx.match[1]);
        let nextStepIndex = parseInt(ctx.match[2]);
        let currentStepIndex = nextStepIndex-1;
        let startPoll = nextStepIndex === 0;
        let poll = ctx.scene.state.poll;

        if (startPoll) {
            ctx.scene.state.answers = [];
            ctx.scene.state.totalScore = 0;
            ctx.scene.state.questionIndex = 0;
            return answerWithQuestion(ctx, poll, nextStepIndex);
        }

        let currentQuestion = poll.questions[currentStepIndex];
        let answer = currentQuestion.answers[answerIndex];

        let answers = ctx.scene.state.answers || [];
        let totalScore = ctx.scene.state.totalScore || 0;
        totalScore += answer.score;

        answers.push({
            answerIndex,
            question: currentQuestion.text,
            answer,
        });

        ctx.scene.state.answers = answers;
        ctx.scene.state.totalScore = totalScore;

        return answerWithQuestion(ctx, poll, nextStepIndex);
    });

    return scene;
}