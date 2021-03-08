const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');
const multer = require('@koa/multer');

const stats = require('./routes/stats');
const mailings = require('./routes/mailings');
const users = require('./routes/users');
const payments = require('./routes/payments');
const subscribers = require('./routes/subscribers');
const funnels = require('./routes/funnels');
const stages = require('./routes/stages');
const files = require('./routes/files');
const bots = require('./routes/bots');
const go = require('./routes/go');

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
    .post('/api/subscriber/list', subscribers.list.bind(subscribers))
    .post('/api/subscriber/update', subscribers.update.bind(subscribers));

router
    .post('/api/bots/list', bots.list.bind(bots))
    .post('/api/bots/add', bots.add.bind(bots))
    .post('/api/bots/update', bots.update.bind(bots))
    .post('/api/bots/delete', bots.delete.bind(bots));

router
    .post('/api/funnels/list', funnels.list.bind(funnels))
    .post('/api/funnels/add', funnels.add.bind(funnels))
    .post('/api/funnels/update', funnels.update.bind(funnels))
    .post('/api/funnels/delete', funnels.delete.bind(funnels));

router
    .post('/api/funnel/:id/stages/list', stages.list.bind(stages))
    .post('/api/funnel/:id/stages/add', stages.add.bind(stages))
    .post('/api/funnel/:id/stages/update', stages.update.bind(stages))
    .post('/api/funnel/:id/stages/delete', stages.delete.bind(stages));

router
    .post('/api/user/list', users.list.bind(users))
    .post('/api/user/add', users.add.bind(users))
    .post('/api/user/update', users.update.bind(users))
    .post('/api/user/delete', users.delete.bind(users))
    .post('/api/user/check', users.check.bind(users))
    .post('/api/user/login', users.login.bind(users));

router
    .post('/api/file/link', upload.single('file'), files.getLink.bind(files))
    .post('/api/file/delete', files.deleteFile.bind(files));

router
    .get('/go/:linkId/:stageId/:chatId/:botId', go.go);

app
    .use(bodyParser({
        formLimit: '50mb',
        jsonLimit: '1mb',
    }))
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(PORT, HOST);