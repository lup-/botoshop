const Funnel = require('../../managers/Funnel');

module.exports = function (bot, botManager) {
    return async (ctx, next) => {
        let funnelId = ctx.session.funnelId || false;
        if (!funnelId) {
            funnelId = ctx.session && ctx.session.ref && ctx.session.ref.ref;
        }

        if (!funnelId) {
            let profile = ctx.profile ? ctx.profile.get() : false;
            funnelId = profile && profile.funnelId ? profile.funnelId : false;
        }

        if (!funnelId) {
            let funnels = await botManager.loadFunnels(bot);
            let funnel = funnels[0];
            funnelId = funnel.id;
        }

        let funnel = new Funnel(funnelId);
        await funnel.init();

        if (funnel.isFinished()) {
            await funnel.switchToFallback();
        }

        ctx.funnel = funnel;
        next();
    }
}