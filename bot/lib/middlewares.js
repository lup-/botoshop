const initSessionIdsMiddleware = require('./middlewares/initSessionIdsMiddleware');
const saveRefMiddleware = require('./middlewares/saveRefMiddleware');
const saveUserMiddleware = require('./middlewares/saveUserMiddleware');
const initSessionProfileMiddleware = require('./middlewares/initSessionProfileMiddleware');
const saveActivityMiddleware = require('./middlewares/saveActivityMiddleware');
const checkSubscriptionMiddleware = require('./middlewares/checkSubscriptionMiddleware');
const safeReplyMiddleware = require('./middlewares/safeReplyMiddleware');
const blockNonPrivate = require('./middlewares/blockNonPrivate');
const catchErrors = require('./middlewares/catchErrors');
const initShop = require('./middlewares/initShop');
const toggleBlockedMiddleware = require('./middlewares/toggleBlockedMiddleware');

module.exports = {
    initSessionIdsMiddleware,
    saveRefMiddleware,
    saveUserMiddleware,
    initSessionProfileMiddleware,
    saveActivityMiddleware,
    checkSubscriptionMiddleware,
    safeReplyMiddleware,
    blockNonPrivate,
    catchErrors,
    initShop,
    toggleBlockedMiddleware
}