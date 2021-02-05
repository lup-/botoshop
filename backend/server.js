const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const stats = require('./routes/stats');
const mailings = require('./routes/mailings');
const users = require('./routes/users');
const payments = require('./routes/payments');
const subscribers = require('./routes/subscribers');

const PORT = 3000;
const HOST = '0.0.0.0';

const app = new Koa();
const router = new Router();

router
    .post('/api/stats/details', stats.details);

router
    .post('/api/mailing/list', mailings.list);

router
    .post('/api/payment/list', payments.list);

router
    .post('/api/subscriber/list', subscribers.list);

router
    .post('/api/user/list', users.list)
    .post('/api/user/add', users.add)
    .post('/api/user/update', users.update)
    .post('/api/user/delete', users.delete)
    .post('/api/user/check', users.check)
    .post('/api/user/login', users.login);

app
    .use(bodyParser({
        formLimit: '50mb',
        jsonLimit: '1mb',
    }))
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(PORT, HOST);