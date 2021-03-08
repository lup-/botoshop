const {getDb} = require('../modules/Database');
const moment = require('moment');

const DB_NAME = 'funnel_bot';

module.exports = {
    async go(ctx) {
        let linkId = ctx.params.linkId;
        let stageId = ctx.params.stageId;
        let chatId = parseInt(ctx.params.chatId);
        let botId = parseInt(ctx.params.botId);

        try {
            let db = await getDb(DB_NAME);
            let user = await db.collection('users').findOne({"chat.id": chatId, botId});
            let userId = user.user.id;

            let stage = await db.collection('stages').findOne({id: stageId});
            let funnelId = stage.funnelId;

            let linkItem = await db.collection('links').findOne({id: linkId});

            await db.collection('funnelActivity').insertOne({
                date: moment().unix(),
                type: 'link',
                userId,
                chatId,
                botId,
                linkId,
                stageId,
                funnelId
            });

            return ctx.redirect(linkItem.link);
        }
        catch (e) {
            ctx.body = 'Ошибка перехода по ссылке. Попробуйте обновить страницу позже'
        }
    },
}