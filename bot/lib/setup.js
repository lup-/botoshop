const fs = require('fs');
const path = require('path');
const { Telegraf, Scenes, session } = require('telegraf');
const { Stage } = Scenes;

const {
    initSessionIdsMiddleware,
    saveRefMiddleware,
    saveUserMiddleware,
    initSessionProfileMiddleware,
    saveActivityMiddleware,
    checkSubscriptionMiddleware,
    safeReplyMiddleware,
    catchErrors,
    blockNonPrivate,
    initFunnel,
    toggleBlockedMiddleware
} = require('./middlewares');

const store = new Map();
const {clone} = require('./helpers');

const SCENE_BASE_DIR = `${__dirname}/../scenes`;

class Injector {
    constructor(token) {
        this.app = new Telegraf(token);
        this.stage = false;
    }

    addSession(initialState = {}, ttlSec = false) {
        let opts = {store};
        if (ttlSec && ttlSec > 0) {
            opts.ttl = ttlSec;
        }

        this.app.use(session(opts));

        let hasInitialState = initialState && Object.keys(initialState).length > 0;
        if (hasInitialState) {
            this.app.use((ctx, next) => {
                let hasEmptySession =
                    (ctx && ctx.session && typeof (ctx.session) === 'object' && Object.keys(ctx.session).length === 0) ||
                    (typeof(ctx.session) === 'undefined');

                if (hasEmptySession) {
                    ctx.session = clone(initialState);
                }

                return next();
            });
        }
        else {
            this.app.use((ctx, next) => {
                if (typeof (ctx.session) === 'undefined') {
                    ctx.session = {};
                }

                next();
            });
        }
        return this;
    }

    addSafeReply(blockedHandler = null, errorsHandler = null) {
        let safeReply = new safeReplyMiddleware();

        errorsHandler = errorsHandler ? errorsHandler : catchErrors(blockedHandler);

        safeReply.setDefaultFallback(errorsHandler);

        if (blockedHandler) {
            safeReply.setBlockedHandler(blockedHandler);
        }

        this.app.use(safeReply.getMiddleware());
        this.app.catch(errorsHandler);
        return this;
    }

    addIdsToSession() {
        this.app.use(initSessionIdsMiddleware());
        return this;
    }

    addRefSave() {
        this.app.use(saveRefMiddleware());
        return this;
    }

    addUserSave() {
        this.app.use(saveUserMiddleware());
        return this;
    }

    addProfile() {
        this.app.use(initSessionProfileMiddleware());
        return this;
    }

    addSaveActivity() {
        this.app.use(saveActivityMiddleware);
        return this;
    }

    addSubscription() {
        this.app.use(checkSubscriptionMiddleware);
        return this;
    }

    blockNonPrivate() {
        this.app.use(blockNonPrivate);
        return this;
    }

    addFunnels(bot, botManager) {
        this.app.use(initFunnel(bot, botManager));
        return this;
    }

    addHandleBlocks() {
        this.app.use(toggleBlockedMiddleware);
        return this;
    }

    addScenes(code, params, exclude = []) {
        const stage = this.stage ? this.stage : new Stage();

        let dir = code ? `${SCENE_BASE_DIR}/${code}/` : SCENE_BASE_DIR;
        let filenames = fs.readdirSync(dir);
        filenames.forEach(file => {
            if (exclude.indexOf(file) !== -1) {
                return;
            }

            let fullFilename = path.join(dir, file);
            let scene = require(fullFilename);
            stage.register(scene(params));
        });

        this.app.use(stage.middleware());
        this.stage = stage;

        return this;
    }

    addScene(groupCode, sceneCode, params) {
        const stage = this.stage ? this.stage : new Stage();

        let filename = `${SCENE_BASE_DIR}/${groupCode}/${sceneCode}.js`;
        let canonicalFilename = path.normalize(filename);

        let scene = require(canonicalFilename);
        stage.register(scene(params));

        this.stage = stage;
        this.app.use(stage.middleware());
        return this;
    }

    addDisclaimer(text, afterAccept) {
        this.app.start(async ctx => {
            let messageShown = ctx && ctx.session && ctx.session.introShown;
            if (messageShown) {
                return afterAccept(ctx);
            }

            try {
                ctx.session.introShown = true;
                return ctx.reply(text, menu([{code: '_accept', text: 'Понятно'}]));
            }
            catch (e) {
            }
        });

        this.app.action('_accept', afterAccept);
        return this;
    }

    addRoute(type, subType, handler) {
        this.app[type](subType, handler);
        return this;
    }

    addDefaultRoute(defaultRoute, addStart = true, onlyPrivate = true) {
        let route = onlyPrivate
            ? (ctx, next) => {
                if (ctx.chat && ctx.chat.type !== 'private') {
                    return next();
                }
                else {
                    return defaultRoute(ctx, next);
                }
            }
            : defaultRoute;
        if (addStart) {
            this.app.start(route);
        }

        this.app.action(/.*/, route);
        this.app.on('message', route);
        return this;
    }

    get() {
        return this.app;
    }
}


module.exports = (app) => new Injector(app);