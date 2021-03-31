const Funnel = require('../../managers/Funnel');

function ensureFunnelInBot(funnelId, botFunnels) {
    let funnelExistsInBot = botFunnels.find(funnel => funnel.id === funnelId);
    if (!funnelExistsInBot) {
        funnelId = false;
    }
    return funnelId;
}

module.exports = function (bot, botManager) {
    return async (ctx, next) => {
        let funnels = await botManager.loadFunnels(bot);
        let funnelId = ctx.session.funnelId || false;

        if (!funnelId) {
            funnelId = ctx.session && ctx.session.ref && ctx.session.ref.ref;
            funnelId = ensureFunnelInBot(funnelId, funnels);
        }

        if (!funnelId) {
            let profile = ctx.profile ? ctx.profile.get() : false;
            funnelId = profile && profile.funnelId ? profile.funnelId : false;
            funnelId = ensureFunnelInBot(funnelId, funnels);
        }

        if (!funnelId) {
            let funnel = funnels[0];
            funnelId = funnel.id;
        }

        let funnel = new Funnel(funnelId);
        await funnel.init();

        if (funnel.isFinished()) {
            await funnel.switchToFallback();
        }

        ctx.session.funnelId = funnelId;
        ctx.funnel = funnel;
        next();
    }
}