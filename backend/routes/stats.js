const {getDb} = require('../modules/Database');
const {getInfoByShop} = require('../modules/BotInfo');
const moment = require('moment');

module.exports = {
    async getBotId(ctx) {
        let shop = ctx.request.body && ctx.request.body.shop
            ? ctx.request.body.shop || false
            : false;
        let botInfo = await getInfoByShop(shop);
        return botInfo ? botInfo.id : null;
    },
    async details(ctx) {
        let botId = this.getBotId(ctx);
        let tz = ctx.request.body && ctx.request.body.tz
            ? ctx.request.body.tz || false
            : false;

        let defaultRange = {start: moment().startOf('d').unix(), end: moment().endOf('d').unix()};
        let range = ctx.request.body && ctx.request.body.range
            ? ctx.request.body.range || defaultRange
            : defaultRange;

        let defaultScale = 'H';
        let scale = ctx.request.body && ctx.request.body.scale
            ? ctx.request.body.scale || defaultScale
            : defaultScale;

        let formats = [
            {scale: 'Y', slot: '%Y"', tag: '%Y', momentTag: 'YYYY', step: 'y'},
            {scale: 'M', slot: '%Y%m', tag: '%m.%Y', momentTag: 'MM.YYYY', step: 'month'},
            {scale: 'D', slot: '%Y%m%d', tag: '%d.%m.%Y', momentTag: 'DD.MM.YYYY', step: 'd'},
            {scale: 'H', slot: '%Y%m%d%H', tag: '%H:00, %d.%m.%Y', momentTag: 'HH:00, DD.MM.YYYY', step: 'h'},
        ];

        let format = formats.find(item => item.scale === scale) || formats[3];

        let start = moment.unix(range.start);
        let tagsCount = moment.unix(range.end).diff(moment.unix(range.start), format.step);
        let steps = Array(tagsCount).fill(0).map((_, index) => start.clone().add(index, format.step));
        let tags = steps.map(step => step.format(format.momentTag));
        let unixSteps = steps.map(step => step.unix());

        let projectQuery = unixSteps.reduce( (fields, time, index) => {
            let key = `date_group_${index}`;
            fields[key] = {"$cond": [ { "$lte": [ "$targetDate", time ] }, 1, 0 ]};
            return fields;
        }, {} );

        let groupQuery = unixSteps.reduce( (fields, time, index) => {
            let fieldKey = `date_group_${index}`;
            let key = `count_${index}`;
            fields[key] = {"$sum": `$${fieldKey}`};
            return fields;
        }, {'_id': '1'} );

        let db = await getDb();
        let users = db.collection('users');
        let refs = db.collection('refs');
        let activity = db.collection('activity');

        let totalUsersResult = await users.aggregate([
            {$match: {botId}},
            {$set: {targetDate: "$registered"}},
            {$project: projectQuery},
            {$group: groupQuery}
        ]).toArray();

        let usersResult = await users.aggregate([
            {$match: {botId}},
            {$match: {$or: [
                {blocked: {$in: [null, false]}},
                {$and: [ {blocked: true}, {blockedSince: {$gt: range.end}} ]}
            ]}},
            {$match: {$and: [{registered: {$gte: range.start}}, {registered: {$lt: range.end}}]}},
            {$set: {registered_date: {$toDate: {$multiply: ["$registered", 1000]}}}},
            {$set: {
                    timeslot: { $dateToString: {date: "$registered_date", format: format.slot} },
                    tag: {$dateToString: {date: {$min: "$registered_date"}, format: format.tag} }
                }
            },
            {$group: {"_id": "$timeslot", "count": {$sum: 1}, "tag": {$first: "$tag"}}},
            {$sort: {"tag": 1}}
        ]).toArray();

        let refsResult = await refs.aggregate([
            {$match: botId},
            {$match: {$and: [{date: {$gte: range.start}}, {date: {$lt: range.end}}]}},
            {$set: {registered_date: {$toDate: {$multiply: ["$date", 1000]}}}},
            {$set: {
                    timeslot: { $dateToString: {date: "$registered_date", format: format.slot} },
                    tag: {$dateToString: {date: {$min: "$registered_date"}, format: format.tag} }
                }
            },
            {$group: {"_id": {$concat: ["$timeslot", ":", "$ref"]}, "count": {$sum: 1}, "tag": {$first: "$tag"}, "ref": {$first: "$ref"}}},
            {$sort: {"tag": 1}}
        ]).toArray();

        let activeUsersResult = await activity.aggregate([
            {$match: botId},
            {$match: {$and: [{date: {$gte: range.start}}, {date: {$lt: range.end}}]}},
            {$set: {date_date: {$toDate: {$multiply: ["$date", 1000]}}}},
            {$set: {
                    timeslot: { $dateToString: {date: "$date_date", format: format.slot} },
                    tag: {$dateToString: {date: {$min: "$date_date"}, format: format.tag} }
                }
            },
            {$group: {"_id": "$timeslot", "count": {$sum: 1}, "tag": {$first: "$tag"}}},
            {$sort: {"tag": 1}}
        ]).toArray();

        let refNames = refsResult.map(item => item.ref).filter((ref, index, all) => all.indexOf(ref) === index);

        let stats = tags.map((tag, index) => {
            let userCount = usersResult.find(item => item.tag === tag);
            let activeUserCount = activeUsersResult.find(item => item.tag === tag);

            let count = userCount && userCount['count'] ? userCount['count'] : 0;
            let total = totalUsersResult && totalUsersResult[0] ? totalUsersResult[0][`count_${index}`] || 0 : 0;
            let active = activeUserCount && activeUserCount['count'] ? activeUserCount['count'] : 0;

            return {tag, count, active, total};
        });

        let refStats = refNames.map(refName => {
            let stats = tags.map(tag => {
                let item = refsResult.find(item => item.tag === tag && item.ref === refName);
                let count = item && item['count'] ? item['count'] : 0;
                return {tag, count};
            });

            return {ref: refName, stats};
        });

        let noRefsCount = stats.map(tagTotalStats => {
            let totalTagRefCount = refStats.reduce((sum, refStat) => {
                let tagRefItem = refStat.stats.find(item => item.tag === tagTotalStats.tag);
                if (tagRefItem) {
                    sum += tagRefItem.count;
                }

                return sum;
            }, 0);

            return {tag: tagTotalStats.tag, count: tagTotalStats.count - totalTagRefCount};
        });

        refStats.push({ref: false, stats: noRefsCount});

        ctx.body = {stats, refStats};
    }
}