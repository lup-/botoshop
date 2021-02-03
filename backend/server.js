const Koa = require('koa');
const Router = require('@koa/router');
const bodyParser = require('koa-bodyparser');

const cvs = require('./routes/cvs');

const PORT = 3000;
const HOST = '0.0.0.0';

const app = new Koa();
const router = new Router();

router
    .post('/api/cv/list', cvs.list)
    .post('/api/cv/add', cvs.add)
    .post('/api/cv/update', cvs.update)
    .post('/api/cv/delete', cvs.delete);

app
    .use(bodyParser({
        formLimit: '50mb',
        jsonLimit: '1mb',
    }))
    .use(router.routes())
    .use(router.allowedMethods());

app.listen(PORT, HOST);