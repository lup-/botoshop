const {getDb} = require('../modules/Database');
const shortid = require('shortid');
const moment = require('moment');

const DB_NAME = 'funnel_bot';
const COLLECTION_NAME = 'stages';
const ITEMS_NAME = 'stages';
const ITEM_NAME = 'stage';

module.exports = {
    async getStageStats(funnelId, statFilter = {}) {
        let db = await getDb(DB_NAME);
        let stats = await db.collection('funnelActivity').aggregate([
            { $match: {type: 'stage', funnelId: funnelId} },
            { $match: statFilter },
            { $group: {"_id": "$stageId", shows: {$sum: 1}} }
        ]).toArray();

        return stats;
    },
    async addShowsFieldToStages(stages, stats) {
        return stages.map(stage => {
            let stat = stats.find(stat => stat._id === stage.id);
            let shows = stat ? stat.shows : 0;
            stage.shows = shows;
            return stage;
        });
    },
    async getButtonStats(funnelId, statFilter = {}) {
        let db = await getDb(DB_NAME);
        let stats = await db.collection('funnelActivity').aggregate([
            { $match: {type: 'button', funnelId: funnelId} },
            { $match: statFilter },
            { $group: {
                _id: {$concat: ['$srcStageId', '$dstStageId', '$index']},
                srcStageId: {$first: '$srcStageId'},
                dstStageId: {$first: '$dstStageId'},
                index: {$first: '$index'},
                shows: {$sum: 1}
              }
            }
        ]).toArray();

        return stats;
    },
    addShowsFieldToButtons(stages, stats) {
        for (const buttonStat of stats) {
            let srcStageIndex = stages.findIndex(stage => stage.id === buttonStat.srcStageId);
            if (srcStageIndex === -1) {
                continue;
            }

            let srcStage = stages[srcStageIndex];

            let buttonIndex = srcStage.buttons
                ? srcStage.buttons.findIndex(button => button.type === 'stage' && button.target === buttonStat.dstStageId)
                : -1;
            if (buttonIndex === -1) {
                continue;
            }

            srcStage.buttons[buttonIndex].shows = buttonStat.shows;
            stages[srcStageIndex] = srcStage;
        }

        return stages;
    },
    async getLinkStats(funnelId, statFilter = {}) {
        let db = await getDb(DB_NAME);
        let stats = await db.collection('funnelActivity').aggregate([
            { $match: {type: 'link', funnelId: funnelId} },
            { $match: statFilter },
            { $group: {
                    _id: {$concat: ['$stageId', '$linkId']},
                    stageId: {$first: '$stageId'},
                    linkId: {$first: '$linkId'},
                    shows: {$sum: 1}
                }
            }
        ]).toArray();

        return stats;
    },
    addShowsFieldToLinks(stages, stats) {
        for (const linkStat of stats) {
            let srcStageIndex = stages.findIndex(stage => stage.id === linkStat.stageId);
            if (srcStageIndex === -1) {
                continue;
            }

            let srcStage = stages[srcStageIndex];

            let buttonIndex = srcStage.buttons
                ? srcStage.buttons.findIndex(button => button.type === 'link' && button.linkId === linkStat.linkId)
                : -1;
            if (buttonIndex === -1) {
                continue;
            }

            srcStage.buttons[buttonIndex].shows = linkStat.shows;
            stages[srcStageIndex] = srcStage;
        }

        return stages;
    },

    async list(ctx) {
        let funnelId = ctx.params.id;
        let filter = ctx.request.body && ctx.request.body.filter
            ? ctx.request.body.filter || {}
            : {};

        let statFilter = ctx.request.body && ctx.request.body.statFilter
            ? ctx.request.body.statFilter || {}
            : {};

        let defaultFilter = {
            funnelId,
            'deleted': {$in: [null, false]}
        };

        filter = Object.assign(defaultFilter, filter);

        let db = await getDb(DB_NAME);
        let items = await db.collection(COLLECTION_NAME).find(filter).toArray();

        if (items && items.length > 0) {
            let stageStats = await this.getStageStats(funnelId, statFilter);
            items = await this.addShowsFieldToStages(items, stageStats);

            let buttonStats = await this.getButtonStats(funnelId, statFilter);
            items = await this.addShowsFieldToButtons(items, buttonStats);

            let linkStats = await this.getLinkStats(funnelId, statFilter);
            items = await this.addShowsFieldToLinks(items, linkStats);
        }

        let response = {};
        response[ITEMS_NAME] = items;

        ctx.body = response;
    },
    async disablePreviousStartingStages(funnelId) {
        const db = await getDb(DB_NAME);
        return db.collection(COLLECTION_NAME).updateMany({funnelId}, {$set: {isStarting: false}}, {returnOriginal: false});
    },

    async updateButtonLinkIds(stage) {
        const db = await getDb(DB_NAME);
        let linkButtons = stage.buttons
            ? stage.buttons.filter(button => button.type === 'link')
            : [];

        if (linkButtons.length > 0) {
            let links = linkButtons.map(button => button.target);
            let existingLinkItems = await db.collection('links').find({link: {$in: links}}).toArray();
            let newLinks = links.filter(buttonLink => existingLinkItems.findIndex(savedLinkItem => savedLinkItem.link === buttonLink) === -1);
            if (newLinks.length > 0) {
                let newLinkItems = newLinks.map(newLink => ({
                    id: shortid(),
                    link: newLink,
                    created: moment().unix()
                }));

                await db.collection('links').insertMany(newLinkItems);
                existingLinkItems = await db.collection('links').find({link: {$in: links}}).toArray();
            }

            stage.buttons = stage.buttons.map(button => {
                if (button.type !== 'link') {
                    return button;
                }

                let linkItem = existingLinkItems.find(linkItem => linkItem.link === button.target);
                button.linkId = linkItem ? linkItem.id : null;
                return button;
            });
        }

        return stage;
    },

    deleteShows(itemData) {
        if (itemData.shows) {
            delete itemData.shows;
        }

        if (itemData.buttons && itemData.buttons.length > 0) {
            itemData.buttons = itemData.buttons.map(button => {
                if (button.shows) {
                    delete button.shows;
                }

                return button;
            });
        }

        return itemData;
    },

    async add(ctx) {
        let funnelId = ctx.params.id;
        const db = await getDb(DB_NAME);

        let itemData = ctx.request.body[ITEM_NAME];
        if (itemData._id) {
            let response = {};
            response[ITEM_NAME] = false;
            ctx.body = response;
            return;
        }

        itemData = Object.assign(itemData, {
            id: shortid.generate(),
            created: moment().unix(),
            updated: moment().unix(),
            funnelId
        });

        if (itemData.isStarting) {
            await this.disablePreviousStartingStages(funnelId);
        }

        itemData = this.deleteShows(itemData);
        itemData = await this.updateButtonLinkIds(itemData);

        let result = await db.collection(COLLECTION_NAME).insertOne(itemData);
        let item = result.ops[0];
        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
    async update(ctx) {
        let funnelId = ctx.params.id;
        let db = await getDb(DB_NAME);
        let itemData = ctx.request.body[ITEM_NAME];
        let id = itemData.id;

        if (!id) {
            let response = {};
            response[ITEM_NAME] = false;
            ctx.body = response;
            return;
        }

        if (itemData._id) {
            delete itemData._id;
        }

        if (itemData.isStarting) {
            await this.disablePreviousStartingStages(funnelId);
        }

        itemData = this.deleteShows(itemData);
        itemData = await this.updateButtonLinkIds(itemData);

        await db.collection(COLLECTION_NAME).findOneAndReplace({id, funnelId}, itemData);
        await db.collection(COLLECTION_NAME).updateOne({id, funnelId}, {$set: {updated: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id, funnelId});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
    async delete(ctx) {
        let funnelId = ctx.params.id;
        const db = await getDb(DB_NAME);
        let itemData = ctx.request.body[ITEM_NAME];
        let id = itemData.id;

        let allStages = await db.collection(COLLECTION_NAME).find({
            funnelId,
            'deleted': {$in: [null, false]}
        }).toArray();

        for (let referStage in allStages) {
            let filteredButtons = referStage.buttons
                ? referStage.buttons.filter(button => button.target !== id)
                : [];
            let hasButtonsToDeletedStage = referStage.buttons && filteredButtons.length !== referStage.buttons.length;
            if (hasButtonsToDeletedStage) {
                await db.collection(COLLECTION_NAME).findOneAndUpdate({id: referStage.id, funnelId}, {$set: {
                        buttons: filteredButtons,
                        updated: moment().unix()
                }}, {returnOriginal: false});
            }

            if (referStage.needsAnswer && referStage.nextStage === id) {
                await db.collection(COLLECTION_NAME).findOneAndUpdate({id: referStage.id, funnelId}, {$set: {
                    nextStage: null,
                    updated: moment().unix()
                }}, {returnOriginal: false});
            }
        }

        await db.collection(COLLECTION_NAME).findOneAndUpdate({id, funnelId}, {$set: {deleted: moment().unix()}}, {returnOriginal: false});
        let item = await db.collection(COLLECTION_NAME).findOne({id, funnelId});

        let response = {};
        response[ITEM_NAME] = item;
        ctx.body = response;
    },
}