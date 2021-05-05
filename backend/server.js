const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const multer = require('@koa/multer');

const stats = require('./routes/stats');
const mailings = require('./routes/mailings');
const users = require('./routes/users');
const owners = require('./routes/owners');
const payments = require('./routes/payments');
const categories = require('./routes/categories');
const products = require('./routes/products');
const files = require('./routes/files');
const chat = require('./routes/chat');
const shop = require('./routes/shop');

const PORT = 3000;
const HOST = '0.0.0.0';
const UPLOAD_DIR = process.env.UPLOAD_DIR;

const app = new Koa();
const router = new Router();
const upload = multer({dest: UPLOAD_DIR});

router
    .post('/api/stats/details', stats.details.bind(stats));

router
    .post('/api/mailing/list', mailings.list.bind(mailings))
    .post('/api/mailing/add', mailings.add.bind(mailings))
    .post('/api/mailing/update', mailings.update.bind(mailings))
    .post('/api/mailing/delete', mailings.delete.bind(mailings));

router
    .post('/api/payment/list', payments.list.bind(payments));

router
    .post('/api/category/list', categories.list.bind(categories))
    .post('/api/category/add', categories.add.bind(categories))
    .post('/api/category/update', categories.update.bind(categories))
    .post('/api/category/delete', categories.delete.bind(categories));

router
    .post('/api/product/list', products.list.bind(products))
    .post('/api/product/add', products.add.bind(products))
    .post('/api/product/update', products.update.bind(products))
    .post('/api/product/delete', products.delete.bind(products));

router
    .post('/api/owner/add', owners.add.bind(owners))
    .post('/api/owner/update', owners.update.bind(owners))
    .post('/api/owner/delete', owners.delete.bind(owners))
    .post('/api/owner/check', owners.check.bind(owners))
    .post('/api/owner/login', owners.login.bind(owners))
    .post('/api/owner/register', owners.register.bind(owners));

router
    .post('/api/file/link', upload.single('file'), files.getLink.bind(files))
    .post('/api/file/delete', files.deleteFile.bind(files));

router
    .post('/api/user/list', users.list.bind(users));

router
    .post('/api/shop/update', shop.update.bind(shop));


router
    .post('/api/chat/list', chat.list.bind(chat))
    .post('/api/chat/unread', chat.listUnread.bind(chat))
    .post('/api/chat/read', chat.markRead.bind(chat))
    .post('/api/chat/delete', chat.delete.bind(chat))
    .post('/api/chat/history', chat.history.bind(chat))
    .post('/api/chat/reply', chat.reply.bind(chat))
    .get('/api/chat/:id', chat.load.bind(chat))
    .post('/api/chat/:id', chat.load.bind(chat));

app
    .use(bodyParser({
        formLimit: '50mb',
        jsonLimit: '1mb',
    }))
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(PORT, HOST);