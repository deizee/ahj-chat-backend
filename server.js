const http = require('http');
const Koa = require('koa');
const cors = require('@koa/cors');
const koaBody = require('koa-body');
const WS = require('ws');
const Router = require('koa-router');
const router = new Router();
const idGenerator = require('node-unique-id-generator');

const app = new Koa();
const port = process.env.PORT || 3000;
const userState = [];

app.use(cors());
app.use(koaBody({urlencoded: true, multipart: true, json: true,}));

router.post('/newuser', async (ctx) => {
    if (Object.keys(ctx.request.body).length === 0) {
        ctx.response.body = 'Enter your nickname';
    }
    const { name } = JSON.parse(ctx.request.body);
    const isExist = userState.find(user => user.name === name);
    if (!isExist) {
        const newUser = {
            id: idGenerator.generateGUID(),
            name: name,
        };
        userState.push(newUser);
        ctx.response.body = {
            status: 'ok',
            user: newUser,
        };
    } else {
        ctx.response.body = {
            status: 'error',
            message: 'This nickname is alredy exist',
        };
    }
})

app.use(router.routes());

const server = http.createServer(app.callback());
const wsServer = new WS.Server({ server });

wsServer.on('connection', (ws, req) => {
    ws.on('message', msg => {
        const reseivedMsg = JSON.parse(msg);
        if (reseivedMsg.type === 'exit') {
            const idx = userState.findIndex(user => user.name === reseivedMsg.user.name);
            userState.splice(idx, 1);
            [...wsServer.clients].filter(o => o.readyState === WS.OPEN).forEach(o => o.send(JSON.stringify(userState)));
            return;
        }
        if (reseivedMsg.type === 'send') {
            [...wsServer.clients].filter(o => o.readyState === WS.OPEN).forEach(o => o.send(msg));
        }
    });
    [...wsServer.clients].filter(o => o.readyState === WS.OPEN).forEach(o => o.send(JSON.stringify(userState)));
})

server.listen(port, () => console.log(`Server has been started at ${port} port`));

