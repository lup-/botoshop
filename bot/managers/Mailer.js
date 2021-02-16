const moment = require('moment');
const shortid = require('shortid');
const {getDb} = require('../lib/database');

const {wait, eventLoopQueue} = require('../lib/helpers');
const Sender = require('./Sender');

const STATUS_NEW = 'new';
const MAILING_STATUS_NEW = 'new';
const MAILING_STATUS_PROCESSING = 'processing';
const MAILING_STATUS_FINISHED = 'finished';

const MAILINGS_CHECK_INTERVAL_SEC = process.env.MAILINGS_CHECK_INTERVAL_SEC ? parseInt(process.env.MAILINGS_CHECK_INTERVAL_SEC) : 60;
const TEST_USER_ID = process.env.TEST_USER_ID || 483896081;
const TEST_CHAT_ID = process.env.TEST_CHAT_ID || TEST_USER_ID;
const TEST_QUEUE_SIZE = process.env.TEST_QUEUE_SIZE ? parseInt(process.env.TEST_QUEUE_SIZE) : 100;
const START_DELAY_SECONDS = process.env.START_DELAY_SECONDS ? parseInt(process.env.START_DELAY_SECONDS) : 300;

module.exports = class Mailer {
    constructor() {
        this.runLoop = false;
        this.activeSenders = [];
        this.stopCallback = false;
        this.blockedHandler = false;
    }

    async createMailing(message) {
        let db = await getDb();

        if (!message) {
            return false;
        }

        let mailing = {
            id: shortid.generate(),
            status: 'new',
            startAt: moment().add(START_DELAY_SECONDS, 'seconds').unix(),
            created: moment().unix(),
            updated: moment().unix(),
            message
        }

        let result = await db.collection('mailings').insertOne(mailing);
        return result && result.ops && result.ops[0] ? result.ops[0] : false;
    }

    setBlockedHandler(blockedHandler) {
        this.blockedHandler = blockedHandler;
    }

    async makeTestQueue(mailing) {
        if (!mailing.id) {
            return false;
        }

        return Array(TEST_QUEUE_SIZE).fill(false).map(_ => ({
            mailing: mailing.id,
            userId: TEST_USER_ID,
            chatId: TEST_CHAT_ID,
            status: STATUS_NEW
        }));
    }

    async makeQueue(mailing) {
        if (mailing.isTest) {
            return this.makeTestQueue(mailing);
        }

        let db = await getDb();
        let now = moment().unix();
        let foundUsers = await db.collection('profiles').find({
            subscribed: true,
            blocked: {$in: [null, false]},
            $or: [
                {subscribedTill: {$gte: now}},
                {subscribedTill: {$in: [null, false, 0]}}
            ]
        }).toArray();

        return foundUsers.map(profile => ({
            mailing: mailing.id,
            userId: profile.userId,
            chatId: profile.chatId,
            status: STATUS_NEW
        }));
    }

    async initQueue(mailing) {
        if (!mailing.id) {
            return false;
        }

        let mailingDb = await getDb();
        let queueCount = await mailingDb.collection('mailingQueue').countDocuments({mailing: mailing.id});
        if (queueCount > 0) {
            return;
        }

        let queue = await this.makeQueue(mailing);

        if (queue.length > 0) {
            let result = await mailingDb.collection('mailingQueue').insertMany(queue);
            return result && result.result && result.result.ok;
        }

        return false;
    }

    async initProgress(mailing) {
        let db = await getDb();
        await db.collection('mailings').updateOne({id: mailing.id}, {$set: {
            dateStarted: moment().unix(),
            status: MAILING_STATUS_PROCESSING,
        }});

        if (!mailing.total) {
            let queueCount = await db.collection('mailingQueue').countDocuments({mailing: mailing.id});

            await db.collection('mailings').updateOne({id: mailing.id}, {$set: {
                total: queueCount
            }});
        }
    }

    clearSender(mailingId) {
        let index = this.activeSenders.findIndex(item => item.mailing.id === mailingId);
        if (index !== -1) {
            this.activeSenders.splice(index, 1);
        }
    }

    async finishMailing(mailingId) {
        let db = await getDb();
        await db.collection('mailings').updateOne({id: mailingId}, {$set: {
            dateFinished: moment().unix(),
            status: MAILING_STATUS_FINISHED,
        }});
        return this.clearSender(mailingId);
    }

    async getPendingMailings() {
        let db = await getDb();
        let now = moment().unix();
        return db.collection('mailings').find({
            startAt: {'$lte': now},
            status: {'$in': [MAILING_STATUS_NEW, MAILING_STATUS_PROCESSING]},
        }).toArray();
    }

    async getNewMailings() {
        let allMailings = await this.getPendingMailings();
        let mailingIdsInWork = this.activeSenders
            .map(item => item.mailing.id)
            .filter( (id, index, ids) => ids.indexOf(id) === index );
        return allMailings.filter(mailing => mailingIdsInWork.indexOf(mailing.id) === -1);
    }

    getActiveSender(mailingId) {
        return this.activeSenders.find(item => item.mailing.id === mailingId) || false;
    }

    async startSending(mailing) {
        let activeSender = this.getActiveSender(mailing.id);
        if (activeSender) {
            return;
        }

        await this.initQueue(mailing);
        await this.initProgress(mailing);

        return new Promise(async resolve => {
            let sender = new Sender(mailing.id);
            await sender.init(mailing, this.blockedHandler);

            this.activeSenders.push({mailing, sender});
            setTimeout(async () => {
                resolve();
                await sender.sendAllMessages();
                await this.finishMailing(mailing.id);
            });
        });
    }

    stop() {
        this.runLoop = false;
        return new Promise(resolve => {
            this.stopCallback = resolve;
        });
    }

    launch() {
        return setTimeout(async () => {
            this.runLoop = true;

            while (this.runLoop) {
                let mailings = await this.getNewMailings();

                if (mailings && mailings.length > 0) {
                    for (const mailing of mailings) {
                        await this.startSending(mailing);
                    }
                }

                await wait(MAILINGS_CHECK_INTERVAL_SEC * 1000);
                await eventLoopQueue();
            }

            if (this.stopCallback) {
                this.stopCallback();
            }
        }, 0);
    }
}
