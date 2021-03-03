const {menu, escapeHTML} = require('./helpers');

function dataUriToBuffer(uri) {
    let data = uri.split(',')[1];
    return Buffer.from(data,'base64');
}
function getButtons(message, extra = {}) {
    let buttons = message.buttons.map(button => {
        let hasNoType = !Boolean(button.type);
        let isLink = hasNoType || button.type === 'link';
        return isLink
            ? {text: button.text, url: button.target}
            : {text: button.text, code: `goto_${button.target}`}
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

async function sendMessage(telegram, chatId, message) {
    let caption = escapeHTML(message.text);
    let hasVideo = message.videos && message.videos.length > 0;
    let hasPhoto = message.photos && message.photos.length > 0;
    let hasCaption = caption.length > 0;
    let hasButtons = message.buttons.length > 0;

    let sentMessages = [];

    let medias = hasPhoto
        ? message.photos.map(photo => {
            return {media: {source: dataUriToBuffer(photo.src)}, type: 'photo'}
        })
        : [];

    let extra = getExtra(message);
    let buttons = message.needsAnswer ? [] : getButtons(message, extra);
    let mediaExtra = message.needsAnswer ? [] : getButtons(message, extra);
    if (hasCaption) {
        mediaExtra.caption = caption;
        mediaExtra.parse_mode = 'html';
    }

    if (hasVideo) {
        let hasNoPhoto = message.photos.length === 0;

        if (message.telescopeVideo) {
            for (const index in message.videos) {
                let video = message.videos[index];
                let isLastVideo = parseInt(index) === message.videos.length-1;
                let url = encodeURI(video.src);

                if (isLastVideo && hasNoPhoto) {
                    let lastMessage = await telegram.sendVideoNote(chatId, {url}, mediaExtra);
                    sentMessages.push(lastMessage);
                    return sentMessages;
                }
                else {
                    let message = await telegram.sendVideoNote({url}, extra);
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
            let url = encodeURI(message.videos[0].src);
            singleMediaMessage = await telegram.sendVideo(chatId, {url}, mediaExtra);
        }
        else {
            singleMediaMessage = await telegram.sendPhoto(chatId, {source: dataUriToBuffer(message.photos[0].src)}, mediaExtra);
        }

        sentMessages.push(singleMediaMessage);
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
            return sentMessages;
        }
        else {
            if (hasCaption) {
                medias[0]['caption'] = caption;
                medias[0]['parse_mode'] = 'html';
            }
            let mediaMessages = await telegram.sendMediaGroup(chatId, medias, extra);
            sentMessages = sentMessages.concat(mediaMessages);
            return sentMessages;
        }
    }

    let lastMessage = await telegram.sendMessage(chatId, caption, buttons);
    sentMessages.push(lastMessage);
    return sentMessages;
}

module.exports = {sendMessage};