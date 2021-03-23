const {getDb} = require('../modules/Database');
const moment = require('moment');
const { Readable } = require("stream")

module.exports = {
    jsonToCsv(data, headers) {
        let fields = Object.keys(headers);
        let header = fields.map(field => headers[field]).join(';');

        let rows = [header];
        for (let record of data) {
            let row = fields.map(field => record[field]).join(';');
            rows.push(row);
        }

        return rows.join('\n');
    },

    async anyExport(ctx) {
        const exportType = ctx.params.type;
        let filter = ctx.request.body && ctx.request.body[exportType]
            ? ctx.request.body[exportType] || {}
            : {};

        let methodName = exportType + 'Export';
        let {stats, headers} = await this[methodName](filter);
        let csv = this.jsonToCsv(stats, headers);

        ctx.body = Readable.from([csv]);
        ctx.attachment(`${exportType}.csv`)
    },

    getQuery(filter) {
        let query = {};
        if (filter.funnels && filter.funnels.length > 0) {
            query.funnelId = {$in: filter.funnels};
        }

        if (filter.start && filter.end) {
            query['$and'] = [
                {date: {$gte: filter.start}},
                {date: {$lte: filter.end}}
            ]
        }
        else if (filter.start) {
            query.date =  {$gte: filter.start}
        }
        else if (filter.end) {
            query.date =  {$lte: filter.end}
        }

        return query;
    },
    async getFunnelsWithStages(filter) {
        let query = {};
        if (filter.funnels && filter.funnels.length > 0) {
            query.funnelId = {$in: filter.funnels};
        }

        let db = await getDb();
        let funnels = await db.collection('funnels').aggregate([
            {$match: query},
            {$lookup: {
                    from: 'stages',
                    let: {
                        funnelId: '$id',
                    },
                    pipeline: [
                        { $match: {
                            deleted: {$in: [null, false]},
                            $expr: {$eq: ["$funnelId", "$$funnelId"]}
                        } }
                    ],
                    as: 'stages'
                }
            }
        ]).toArray();

        return funnels;
    },
    nextStage(stage, stages) {
        if (stage.nextStage) {
            return stages.filter(nextStage => stage.nextStage === nextStage.id);
        }

        let nextStageButtons = stage && stage.buttons ? stage.buttons.filter(button => button.type === 'stage') : [];
        if (nextStageButtons.length > 0) {
            let nextStageIds = nextStageButtons.map(button => button.target);
            return stages.filter(stage => nextStageIds.indexOf(stage.id) !== -1);
        }

        return false;
    },
    sortStagesByButtons(allStages, entryStages = false, sortedStages = []) {
        if (!entryStages) {
            entryStages = allStages.filter(stage => stage.isStarting);
        }

        for (let entryStage of entryStages) {
            let stage = entryStage;

            do {
                let stageWasAddedBefore = sortedStages.findIndex(existingStage => existingStage.id === stage.id) !== -1;
                if (stageWasAddedBefore) {
                    break;
                }

                sortedStages.push(stage);
                let nextStages = this.nextStage(stage, allStages);
                let multipleNextStages = nextStages instanceof Array && nextStages.length > 1;
                if (multipleNextStages) {
                    sortedStages = this.sortStagesByButtons(allStages, nextStages, sortedStages);
                }
                else {
                    stage = nextStages instanceof Array ? nextStages[0] : nextStages;
                }
            } while (stage);
        }

        return sortedStages;
    },
    async getLinksStats(filter) {
        let query = this.getQuery(filter);
        let groupDays = filter.groupDays === true;

        let db = await getDb();
        let groupBy = groupDays
            ? {day: "$day", funnelId: "$funnelId", stageId: "$stageId", linkId: "$linkId"}
            : {funnel: "$funnelId", stageId: "$stageId", linkId: "$linkId"}
        let sortBy = groupDays
            ? {day: -1, visits: -1}
            : {visits: -1}

        let stats = await db.collection('funnelActivity').aggregate([
            { $match: {type: 'link'} },
            { $match: query },
            { $addFields: {
                    day: {$dateToString: {date: {$toDate:{$multiply: ['$date', 1000]}}, format: '%Y-%m-%d'}}
                }
            },
            { $group: {
                    "_id": groupBy,
                    "linkId": {$last: "$linkId"},
                    "userIds": {$addToSet: "$userId"},
                    "clicks": {$sum: 1}
                }
            },
            { $project: {day: "$_id.day", clicks: 1, users: {$size: "$userIds"}, funnelId: "$_id.funnelId", stageId: "$_id.stageId", linkId: 1} },
            { $project: {_id: 0, userIds: 0} },
            { $lookup: {
                    from: 'links',
                    localField: 'linkId',
                    foreignField: 'id',
                    as: 'link'
            } },
            { $sort: sortBy },
        ]).toArray();

        return stats;
    },

    async stagesExport(filter) {
        let query = this.getQuery(filter);
        let groupDays = filter.groupDays === true;

        let db = await getDb();
        let groupBy = groupDays
            ? {day: "$day", funnel: "$funnelId", stage: "$stageId"}
            : {funnel: "$funnelId", stage: "$stageId"};
        let sortBy = groupDays
            ? {day: -1, visits: -1}
            : {visits: -1}

        let stats = await db.collection('funnelActivity').aggregate([
            { $match: {type: 'stage'} },
            { $match: query },
            { $addFields: {
                    day: {$dateToString: {date: {$toDate:{$multiply: ['$date', 1000]}}, format: '%Y-%m-%d'}}
                }
            },
            { $group: {
                    "_id": groupBy,
                    "userIds": {$addToSet: "$userId"},
                    "visits": {$sum: 1}
                }
            },
            { $project: {day: "$_id.day", visits: 1, users: {$size: "$userIds"}, funnelId: "$_id.funnel", stageId: "$_id.stage"} },
            { $project: {_id: 0, userIds: 0} },
            { $sort: sortBy },
        ]).toArray();

        let linkStats = await this.getLinksStats(filter);

        let days = groupDays
            ? stats.map(stats => stats.day).filter((day, index, allDays) => allDays.indexOf(day) === index)
            : [false];

        let exportStats = [];
        let funnels = await this.getFunnelsWithStages(filter);

        for (const day of days) {
            for (let funnel of funnels) {
                let stages = this.sortStagesByButtons(funnel.stages);
                for (let stageIndex in stages) {
                    let stage = stages[stageIndex];

                    let nextStages = this.nextStage(stage, stages) || [];
                    let nextVisits = 0;
                    let nextUsers = 0;

                    for (const nextStage of nextStages) {
                        let nextStageStats = nextStage
                            ? stats.find(stat => {
                                let idsMatch = stat.funnelId === nextStage.funnelId && stat.stageId === nextStage.id

                                return groupDays
                                    ? idsMatch && stat.day === day
                                    : idsMatch;
                              })
                            : false;
                        nextVisits += nextStageStats ? nextStageStats.visits || 0 : 0;
                        nextUsers += nextStageStats ? nextStageStats.users || 0 : 0;
                    }

                    let linkButtons = stage.buttons ? stage.buttons.filter(button => button.type === 'link') : [];
                    let linkClicks = 0;
                    let linkUsers = 0;
                    for (let linkButton of linkButtons) {
                        let linkStat = linkStats.find(stat => stat.stageId === stage.id && stat.linkId === linkButton.linkId);
                        linkClicks += linkStat ? linkStat.clicks || 0 : 0;
                        linkUsers += linkStat ? linkStat.users || 0 : 0;
                    }

                    let stageStats = stats.find(stat => stat.funnelId === stage.funnelId && stat.stageId === stage.id);

                    let visits = stageStats ? stageStats.visits || 0 : 0;
                    let users = stageStats ? stageStats.users || 0 : 0;
                    let convVisits = visits > 0 ? nextVisits / visits * 100 : 0;
                    let convUsers = users > 0 ? nextUsers / users * 100 : 0;

                    exportStats.push({
                        day,
                        funnelTitle: funnel.title,
                        stageTitle: stage.title,
                        visits,
                        users,
                        linkClicks,
                        linkUsers,
                        convVisits: convVisits.toFixed(2),
                        convUsers: convUsers.toFixed(2)
                    });
                }
            }
        }

        let headers = {
            day: 'Дата',
            funnelTitle: 'Воронка',
            stageTitle: 'Этап',
            visits: 'Просмотров',
            users: 'Пользователей',
            linkClicks: 'Переходов по кнопкам-ссылкам',
            linkUsers: 'Пользователей по кнопкам-ссылкам',
            convVisits: 'Конверсия, просмотры',
            convUsers: 'Конверсия, пользователи'
        }

        if (!groupDays) {
            delete headers.day;
        }

        return {
            stats: exportStats,
            headers
        }
    },

    async buttonsExport(filter) {
        let query = this.getQuery(filter);
        let groupDays = filter.groupDays === true;

        let db = await getDb();
        let btnGroupBy = groupDays
            ? {day: "$day", funnel: "$funnelId", srcStageId: "$srcStageId", dstStageId: "$dstStageId"}
            : {funnel: "$funnelId", srcStageId: "$srcStageId", dstStageId: "$dstStageId"};
        let sortBy = groupDays
            ? {day: -1, visits: -1}
            : {visits: -1}

        let btnStats = await db.collection('funnelActivity').aggregate([
            { $match: {type: 'button', mailingId: null} },
            { $match: query },
            { $addFields: {
                    day: {$dateToString: {date: {$toDate:{$multiply: ['$date', 1000]}}, format: '%Y-%m-%d'}}
                }
            },
            { $group: {
                    "_id": btnGroupBy,
                    "index": {$last: "$index"},
                    "userIds": {$addToSet: "$userId"},
                    "clicks": {$sum: 1}
                }
            },
            { $project: {day: "$_id.day", clicks: 1, users: {$size: "$userIds"}, funnelId: "$_id.funnel", srcStageId: "$_id.srcStageId", dstStageId: "$_id.dstStageId", index: 1} },
            { $project: {_id: 0, userIds: 0} },
            { $sort: sortBy },
        ]).toArray();

        let linkStats = await this.getLinksStats(filter);

        let days = groupDays
            ? btnStats.concat(linkStats).map(stats => stats.day).filter((day, index, allDays) => allDays.indexOf(day) === index)
            : [false];

        let exportStats = [];
        let funnels = await this.getFunnelsWithStages(filter);

        for (let day of days) {
            for (let funnel of funnels) {
                let stages = this.sortStagesByButtons(funnel.stages);
                for (let stageIndex in stages) {
                    let stage = stages[stageIndex];
                    let buttons = stage.buttons || [];
                    for (let button of buttons) {
                        let buttonStat = button.type === 'stage'
                            ? btnStats.find(stat => stat.srcStageId === stage.id && stat.dstStageId === button.target)
                            : linkStats.find(stat => stat.stageId === stage.id && stat.linkId === button.linkId);

                        let clicks = buttonStat ? buttonStat.clicks || 0 : 0;
                        let users = buttonStat ? buttonStat.users || 0 : 0;

                        exportStats.push({
                            day,
                            funnelTitle: funnel.title,
                            stageTitle: stage.title,
                            buttonTitle: button.text,
                            clicks,
                            users,
                        })
                    }
                }
            }
        }

        let headers = {
            day: 'Дата',
            funnelTitle: 'Воронка',
            stageTitle: 'Этап',
            buttonTitle: 'Кнопка',
            clicks: 'Нажатий',
            users: 'Пользователей'
        }

        if (!groupDays) {
            delete headers.day;
        }

        return {
            stats: exportStats,
            headers
        }
    },

    async refsExport(filter) {
        let query = this.getQuery(filter);
        if (query.funnelId) {
            query.ref = query.funnelId;
            delete query.funnelId;
        }

        if (filter.botId) {
            query.botId = {$in: filter.botId};
        }

        let db = await getDb();
        let stats = await db.collection('funnelActivity').aggregate([
            { $match: {type: 'link'} },
            { $match: query },
            { $addFields: {
                    day: {$dateToString: {date: {$toDate:{$multiply: ['$date', 1000]}}, format: '%Y-%m-%d'}}
                }
            },
            { $group: {
                    "_id": {day: "$day", botId: "$botId", ref: "$ref", subref: "$subref"},
                    "day": {$last: "$day"},
                    "funnelId": {$last: "$ref"},
                    "botId": {$last: "$botId"},
                    "ref": {$last: "$subref"},
                    "userIds": {$addToSet: "$userId"},
                    "visits": {$sum: 1}
                }
            },
            { $project: {day: 1, funnelId: 1, botId: 1, ref: 1, visits: 1, users: {$size: "$userIds"}} },
            { $project: {"_id": 0, userIds: 0} },
            { $sort: {day: -1, visits: -1} }
        ]).toArray();

        let funnelIds = stats.map(stat => stat.funnelId).filter((funnelId, index, allIds) => allIds.indexOf(funnelId) === index);
        let botIds = stats.map(stat => stat.botId).filter((botId, index, allIds) => allIds.indexOf(botId) === index);

        let funnels = await db.collection('funnels').find({id: {$in: funnelIds}}).toArray();
        let bots = await db.collection('bots').find({botId: {$in: botIds}}).toArray();

        let exportStats = stats.map(stat => {
            let bot = bots.find(bot => bot.botId === stat.botId);
            let funnel = funnels.find(funnel => funnel.id === stats.funnelId);

            return {
                day: stat.day,
                funnelTitle: funnel ? funnel.title : '',
                botUsername: bot.username,
                ref: stat.ref,
                visits: stat.visits,
                users: stat.users,
            }
        });

        let headers = {
            day: 'Дата',
            funnelTitle: 'Воронка',
            botUsername: 'Бот',
            ref: 'Рефка',
            visits: 'Переходов',
            users: 'Пользователей',
        }

        return {
            stats: exportStats,
            headers
        }
    }
}