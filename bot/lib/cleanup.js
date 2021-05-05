const disposeMessages = new Map();

function getKey(botId, chatId) {
    return `${botId}:${chatId}`;
}

function addMessage(botId, chatId, messageId) {
    let key = getKey(botId, chatId);

    let chatMessages = disposeMessages.get(key);
    if (!chatMessages) {
        chatMessages = [];
    }

    chatMessages.push(messageId);
    disposeMessages.set(key, chatMessages);
}

async function cleanMessages(botId, chatId, tg) {
    let key = getKey(botId, chatId);
    let messages = disposeMessages.get(key);
    let hasMessages = messages && messages.length > 0;

    if (!hasMessages) {
        return;
    }

    for (const messageId of messages) {
        try {
            await tg.deleteMessage(chatId, messageId);
        }
        catch (e) {}
    }

    disposeMessages.delete(key);
}

module.exports = {addMessage, cleanMessages}