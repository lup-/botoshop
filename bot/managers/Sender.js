const {Telegraf} = require('telegraf');

const {wait} = require('../lib/helpers');
const {getDb} = require('../lib/database');
const {sendMailingMessage} = require('../lib/message');

const STATUS_NEW = 'new';
const STATUS_BLOCKED = 'blocked';
const STATUS_FAILED = 'failed';
const STATUS_FINISHED = 'sent';

const API_ROOT = process.env.TGAPI_ROOT || 'https://api.telegram.org'

module.exports = class Sender {
    constructor(mailingId = false) {
        this.id = mailingId;
        this.mailing = false;
        this.bot = false;
        this.chunkSize = 5;
    }

    async init(mailing = false, bot = false, blockedHandler = false) {
        if (mailing) {
            this.mailing = mailing;
        }
        else {
            await this.loadMailing();
        }

        this.bot = bot;

        if (blockedHandler) {
            this.blockedHandler = blockedHandler;
        }

        return this;
    }

    getTelegram() {
        let token = this.bot.token;
        return new Telegraf(token, {telegram: {apiRoot: API_ROOT}}).telegram;
    }

    async loadMailing() {
        let db = await getDb();
        this.mailing = await db.collection('mailings').findOne({id: this.id});
    }

    async getNextChats(chunkSize = false) {
        if (!chunkSize) {
            chunkSize = this.chunkSize;
        }
        let db = await getDb();
        return db.collection('mailingQueue').find({
            mailing: this.id,
            bot: this.bot.botId,
            status: STATUS_NEW,
        }).limit(chunkSize).toArray();
    }

    getMessage() {
        return this.mailing.message;
    }

    async sendNextChunk(chunkSize = false) {
        let chats = await this.getNextChats(chunkSize);
        let sendPromises = chats.map( chat => this.sendMailingToChat(chat) );
        return Promise.all(sendPromises);
    }

    async setChatBlock(chat) {
        if (!chat._id) {
            return false;
        }

        let db = await getDb();
        await db.collection('mailingQueue').updateOne({_id: chat._id}, {$set: {status: STATUS_BLOCKED}});
        if (this.blockedHandler) {
            await this.blockedHandler(chat, this.bot);
        }
        return this.updateCounters('blocks');
    }

    async setChatFailed(chat, error) {
        if (!chat._id) {
            return false;
        }

        let db = await getDb();
        await db.collection('mailingQueue').updateOne({_id: chat._id}, {$set: {status: STATUS_FAILED, error}});
        return this.updateCounters('errors');
    }

    async setChatFinished(chat, messages) {
        if (!chat._id) {
            return false;
        }

        let messageIds = messages.map(message => message.message_id);
        let db = await getDb();
        await db.collection('mailingQueue').updateOne({_id: chat._id}, {$set: {status: STATUS_FINISHED, messageIds}});
        return this.updateCounters('success');
    }

    async updateCounters(counterCode) {
        let query = {processed: 1};
        query[counterCode] = 1;

        let mailingDb = await getDb();
        return mailingDb.collection('mailings').updateOne({id: this.id}, {$inc: query});
    }

    async sendMailingToChat(chat) {
        let response = false;

        let telegram = this.getTelegram();

        try {
            response = await sendMailingMessage(telegram, chat.chatId, this.getMessage(), this.mailing, this.bot.botId);
            if (this.id) {
                if (!response) {
                    await this.setChatFailed(chat, false);
                }
                else {
                    await this.setChatFinished(chat, response);
                }
            }
        }
        catch (sendError) {
            if (sendError && sendError.code) {
                if (!this.id) {
                    throw sendError;
                }

                if (sendError.code === 403) {
                    await this.setChatBlock(chat);
                    return false;
                }

                if (sendError.code === 429) {
                    let waitTimeMs = sendError.parameters && sendError.parameters.retry_after
                        ? (sendError.parameters.retry_after || 1) * 1000
                        : 1000;

                    await wait(waitTimeMs);
                    return this.sendMailingToChat(chat);
                }

                await this.setChatFailed(chat, sendError);
                return false;
            }
        }

        return response;
    }

    async sendAllMessages() {
        if (!this.id) {
            return false;
        }

        let isFinished = false;
        while (!isFinished) {
            await this.sendNextChunk();
            isFinished = await this.checkFinished();
        }

        return true;
    }

    async checkFinished() {
        let chats = await this.getNextChats();
        let hasChats = chats && chats.length > 0;
        let noChatsLeft = !hasChats;
        return noChatsLeft;
    }
}