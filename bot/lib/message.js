const path = require('path');
const fs = require('fs');
const {menu, escapeHTML} = require('./helpers');
const {getDb} = require('./database');
const SHORT_LINK_BASE=process.env.SHORT_LINK_BASE;
const UPLOAD_DIR=process.env.UPLOAD_DIR;

function makeButtonUrl(button, stageId, chatId, botId) {
    return `${SHORT_LINK_BASE}/go/${button.linkId}/${stageId}/${chatId}/${botId}`;
}

function dataUriToBuffer(uri) {
    let data = uri.split(',')[1];
    return Buffer.from(data,'base64');
}
function getButtons(message, extra = {}, stageId = null, mailingId = null, chatId = null, botId = null) {
    let hasButtons = message.buttons && message.buttons.length > 0;
    if (!hasButtons) {
        return extra;
    }

    let buttons = message.buttons.map((button, index) => {
        let hasNoType = !Boolean(button.type);
        let isLink = hasNoType || button.type === 'link';
        let isPoll = button.type && button.type === 'poll';
        let buttonId = stageId !== null
            ? `stage:${stageId}:${button.target}:${index}`
            : `mailing:${mailingId}:${index}`;

        if (isLink) {
            let url = makeButtonUrl(button, stageId, chatId, botId);
            return {text: button.text, url};
        }
        else if (isPoll) {
            return {text: button.text, code: `poll/${button.answerIndex}/${button.nextStepIndex}`};
        }
        else {
            return {text: button.text, code: `goto/${buttonId}/${button.target}`};
        }
    });

    return Object.assign(extra, menu(buttons, 1));
}
function getExtra(message) {
    let extra = {};
    if (message.disablePreview) {
        extra.disable_web_page_preview = true;
    }

    if (message.disableNotification) {
        extra.disable_notification = true;
    }

    return extra;
}

function sendMailingMessage(telegram, chatId, message, mailing = null, botId) {
    return sendMessage(telegram, chatId, message, null, mailing, botId);
}
function sendStageMessage(telegram, chatId, stage, botId) {
    let message = stage;
    return sendMessage(telegram, chatId, message, stage, null, botId);
}
async function saveFileIds(messages, stage) {
    let singlePhotoMessage = stage.photos && stage.photos.length === 1;
    let singleVideoMessage = stage.videos && stage.videos.length === 1;
    let message = messages[0];
    let botId = message.from.id;

    if (singlePhotoMessage) {
        let maxFileSize = message.photo.reduce( (maxSize, photo) => {
            return maxSize === false || maxSize < photo.file_size
                ? photo.file_size
                : maxSize
        }, false );

        let maxPhoto = message.photo.find(photo => photo.file_size === maxFileSize);
        let stagePhoto = stage.photos[0];
        if (!stagePhoto.telegramFiles) {
            stagePhoto.telegramFiles = {};
        }

        stagePhoto.telegramFiles[botId] = maxPhoto;
        stage.photos[0] = stagePhoto;

        let db = await getDb();
        await db.collection('stages').updateOne({id: stage.id, funnelId: stage.funnelId}, {$set: {photos: stage.photos}})
    }

    if (singleVideoMessage) {
        let stageVideo = stage.videos[0];
        if (!stageVideo.telegramFiles) {
            stageVideo.telegramFiles = {};
        }

        stageVideo.telegramFiles[botId] = message.video;
        stage.videos[0] = stageVideo;

        let db = await getDb();
        await db.collection('stages').updateOne({id: stage.id, funnelId: stage.funnelId}, {$set: {videos: stage.videos}})
    }

}

async function sendMessage(telegram, chatId, message, stage = null, mailing = null, botId = null) {
    let caption = escapeHTML(message.text, true);
    let isStageMessage = stage !== null;
    let hasVideo = message.videos && message.videos.length > 0;
    let hasPhoto = message.photos && message.photos.length > 0;
    let hasCaption = caption.length > 0;
    let hasButtons = message.buttons && message.buttons.length > 0;

    let sentMessages = [];

    let medias = hasPhoto
        ? message.photos.map(photo => {
            let url = encodeURI(photo.src);
            return {media: {url}, type: 'photo'}
        })
        : [];

    let stageId = stage ? stage.id : null;
    let mailingId = mailing ? mailing.id : null;
    let extra = getExtra(message);
    let buttons = message.needsAnswer ? [] : getButtons(message, extra, stageId, mailingId, chatId, botId);
    let mediaExtra = message.needsAnswer ? [] : getButtons(message, extra, stageId, mailingId, chatId, botId);
    if (hasCaption) {
        mediaExtra.caption = caption;
        mediaExtra.parse_mode = 'html';
    }

    if (hasVideo) {
        let hasNoPhoto = !message.photos || (message.photos && message.photos.length === 0);

        if (message.telescopeVideo) {
            for (const index in message.videos) {
                let video = message.videos[index];
                let isLastVideo = parseInt(index) === message.videos.length-1;

                let uploadPath = path.join(UPLOAD_DIR, video.serverFile.filename);
                let videoStream = fs.createReadStream(uploadPath);
                let videoNote = {source: videoStream};

                if (isLastVideo && hasNoPhoto) {
                    let lastMessage = await telegram.sendVideoNote(chatId, videoNote, mediaExtra);
                    sentMessages.push(lastMessage);
                    return sentMessages;
                }
                else {
                    let message = await telegram.sendVideoNote(videoNote, extra);
                    sentMessages.push(message);
                }
            }
        }
        else {
            let videoMedias = message.videos.map(video => {
                let url = encodeURI(video.src);
                return {media: {url}, type: 'video'};
            });

            medias = medias.concat(videoMedias);
        }
    }

    let hasMedia = medias.length > 0;
    let hasOneMedia = medias.length === 1;

    if (hasOneMedia) {
        let singleMediaMessage;
        if (hasVideo) {
            let savedFile = message.videos[0].telegramFiles && message.videos[0].telegramFiles[botId];
            let media = savedFile
                ? savedFile.file_id
                : {url: encodeURI(message.videos[0].src)};
            singleMediaMessage = await telegram.sendVideo(chatId, media, mediaExtra);
        }
        else {
            let savedFile = message.photos[0].telegramFiles && message.photos[0].telegramFiles[botId];
            let media = savedFile
                ? savedFile.file_id
                : {url: encodeURI(message.photos[0].src)};
            singleMediaMessage = await telegram.sendPhoto(chatId, media, mediaExtra);
        }

        sentMessages.push(singleMediaMessage);
        if (isStageMessage) {
            await saveFileIds(sentMessages, stage);
        }
        return sentMessages;
    }

    buttons.parse_mode = 'html';
    if (hasMedia) {
        if (hasButtons) {
            if (!hasCaption) {
                caption = `Что выбираешь?`;
            }
            let mediaMessages = await telegram.sendMediaGroup(chatId, medias, extra);
            let lastMessage = await telegram.sendMessage(chatId, caption, buttons);
            sentMessages = sentMessages.concat(mediaMessages);
            sentMessages.push(lastMessage);
            if (isStageMessage) {
                await saveFileIds(sentMessages, stage);
            }
            return sentMessages;
        }
        else {
            if (hasCaption) {
                medias[0]['caption'] = caption;
                medias[0]['parse_mode'] = 'html';
            }
            let mediaMessages = await telegram.sendMediaGroup(chatId, medias, extra);
            sentMessages = sentMessages.concat(mediaMessages);
            if (isStageMessage) {
                await saveFileIds(sentMessages, stage);
            }

            return sentMessages;
        }
    }

    let lastMessage = await telegram.sendMessage(chatId, caption, buttons);
    sentMessages.push(lastMessage);

    if (stage) {
        await saveFileIds(sentMessages, stage);
    }
    return sentMessages;
}

module.exports = {sendMessage, sendMailingMessage, sendStageMessage};