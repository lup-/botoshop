const { Scenes } = require('telegraf');
const { BaseScene } = Scenes;
const { menu } = require('../lib/helpers');

function routeToNextStep(ctx) {
    try {
        let hasPassedSettings = ctx.session && ctx.session.profile && ctx.session.profile.category;
        if (hasPassedSettings) {
            return ctx.scene.enter('discover');
        }
        else {
            return ctx.scene.enter('settings');
        }
    }
    catch (e) {}
}

module.exports = function () {
    const scene = new BaseScene('menu');

    scene.enter(async ctx => {
        let hasFavorites = ctx.session.profile && ctx.session.profile.favorite && ctx.session.profile.favorite.length > 0;

        if (hasFavorites) {
            let buttons = [];
            if (hasFavorites) {
                buttons.push( {code: 'favorite', text: 'В избранное'});
            }

            buttons.push({code: 'list', text: 'В каталог'});

            return ctx.replyWithDisposable('reply', 'Куда дальше?', menu(buttons, 1));
        }

        return routeToNextStep(ctx);
    });

    scene.action('accept', ctx => routeToNextStep(ctx));
    scene.action('list', ctx => routeToNextStep(ctx));
    scene.action('favorite', ctx => ctx.scene.enter('discover', {type: 'favorite'}));

    return scene;
}