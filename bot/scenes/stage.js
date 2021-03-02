const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const {menu, escapeHTML} = require('../lib/helpers');

function dataUriToBuffer(uri) {
    let data = uri.split(',')[1];
    return Buffer.from(data,'base64');
}

function getButtons(stage) {
    let buttons = stage.buttons.map(button => {
        return button.type === 'link'
            ? {text: button.text, url: button.target}
            : {text: button.text, code: `goto_${button.target}`}
    });

    return menu(buttons, 1);
}

async function replyWithSceneMessage(ctx, stage) {
    await ctx.funnel.logStage(stage, ctx);

    let caption = escapeHTML(stage.text);
    let hasVideo = stage.videos && stage.videos.length > 0;
    let hasPhoto = stage.photos && stage.photos.length > 0;
    let hasCaption = caption.length > 0;
    let hasButtons = stage.buttons.length > 0;

    let medias = hasPhoto
        ? stage.photos.map(photo => {
            return {media: {source: dataUriToBuffer(photo.src)}, type: 'photo'}
         })
        : [];

    let buttons = stage.needsAnswer ? [] : getButtons(stage);
    let mediaExtra = stage.needsAnswer ? [] : getButtons(stage);
    if (hasCaption) {
        mediaExtra.caption = caption;
        mediaExtra.parse_mode = 'html';
    }

    if (hasVideo) {
        let hasNoPhoto = stage.photos.length === 0;

        if (stage.telescopeVideo) {
            for (const index in stage.videos) {
                let video = stage.videos[index];
                let isLastVideo = parseInt(index) === stage.videos.length-1;
                let url = encodeURI(video.src);

                if (isLastVideo && hasNoPhoto) {
                    return await ctx.replyWithVideoNote({url}, mediaExtra);
                }
                else {
                    await ctx.replyWithVideoNote({url});
                }
            }
        }
        else {
            let videoMedias = stage.videos.map(video => {
                let url = encodeURI(video.src);
                return {media: {url}, type: 'video'};
            });

            medias = medias.concat(videoMedias);
        }
    }

    let hasMedia = medias.length > 0;
    let hasOneMedia = medias.length === 1;

    if (hasOneMedia) {
        if (hasVideo) {
            let url = encodeURI(stage.videos[0].src);
            return ctx.replyWithVideo({url}, mediaExtra);
        }
        else {
            return ctx.replyWithPhoto({source: dataUriToBuffer(stage.photos[0].src)}, mediaExtra);
        }
    }

    if (hasMedia) {
        if (hasButtons) {
            if (!hasCaption) {
                caption = `Что выбираешь?`;
            }
            await ctx.replyWithMediaGroup(medias);
            return ctx.replyWithHTML(caption, buttons);
        }
        else {
            if (hasCaption) {
                medias[0]['caption'] = caption;
                medias[0]['parse_mode'] = 'html';
            }
            return ctx.replyWithMediaGroup(medias);
        }
    }

    return ctx.replyWithHTML(caption, buttons);
}


module.exports = function () {
    const scene = new BaseScene('stage');

    scene.enter(async ctx => {
        let stage = ctx.scene.state.stage || false;
        if (!stage) {
            stage = ctx.funnel.getStartingStage();
            ctx.scene.state.stage = stage;
        }

        return replyWithSceneMessage(ctx, stage);
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