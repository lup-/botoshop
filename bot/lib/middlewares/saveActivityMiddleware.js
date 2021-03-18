const {getDb} = require('../database');
const moment = require('moment');

module.exports = async (ctx, next) => {
    let skipThisUpdate = ctx.chat && ctx.chat.type !== 'private';
    if (skipThisUpdate) {
        return next();
    }

    let db = await getDb();
    let activities = db.collection('activity');

    let userId = ctx.from ? ctx.from.id : false;
    let botId = ctx.botInfo.id;
    let type = ctx.updateType;
    let subTypes = ctx.updateSubTypes;
    let date = moment().unix();
    if (ctx.update && ctx.update[type]) {
        let data = ctx.update[type].data || false;
        await activities.insertOne({userId, botId, date, type, subTypes, data});
    }
    return next();
}