module.exports = function () {

    let blockedHandler = null;
    let notModifiedHandler = () => {};
    let defaultFallback = null;

    return {
        async setBlockedHandler(handler) {
            if (handler && typeof (handler) === 'function') {
                blockedHandler = handler;
            }

            return this;
        },

        async setNotModifiedHandler(handler) {
            if (handler && typeof (handler) === 'function') {
                notModifiedHandler = handler;
            }

            return this;
        },

        async setDefaultFallback(handler) {
            if (handler && typeof (handler) === 'function') {
                defaultFallback = handler;
            }

            return this;
        },

        async safeReply(replyFn, ctxFallbacks, ctx, next) {
            let firstError = null;
            let secondError = null;
            let result = null;

            try {
                result = await replyFn(ctx, next);
            }
            catch (e) {
                firstError = e;
                let isBotBlockedByUser = e && e.code === 403;
                if (isBotBlockedByUser && blockedHandler && typeof (blockedHandler) === 'function') {
                    return blockedHandler(ctx, next, e);
                }

                let isMessageNotModified = e && e.code === 400 && e.description.indexOf('message is not modified') !== -1;
                if (isMessageNotModified && notModifiedHandler && typeof (notModifiedHandler) === 'function') {
                    return notModifiedHandler(ctx, next, e);
                }
            }

            if (!(ctxFallbacks instanceof Array)) {
                ctxFallbacks = [ctxFallbacks];
            }

            for (let ctxFallback of ctxFallbacks) {
                if (!result) {
                    try {
                        result = await ctxFallback(ctx, next);
                    }
                    catch (e) {
                        secondError = e;
                    }
                }
            }

            if (!result) {
                if (defaultFallback && typeof (defaultFallback) === 'function') {
                    return defaultFallback(ctx, next, firstError, secondError);
                }
            }

            return result;
        },

        getMiddleware() {
            return (ctx, next) => {
                ctx.safeReply = this.safeReply.bind(this);
                return next();
            }
        }
    }
}