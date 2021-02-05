module.exports = async (ctx, next) => {
    let skipThisUpdate = ctx.chat.type !== 'private';
    if (skipThisUpdate) {
        return;
    }

    return next();
}
