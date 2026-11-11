// End-to-end tests: REST + Socket.io against an in-memory MongoDB. Run: npm test
process.env.NODE_ENV = 'test';
delete process.env.MONGO_URI;

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const { io: ioc } = require('socket.io-client');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const { initSocket } = require('../src/socket');
const seed = require('../src/seed');
const env = require('../src/config/env');

let server, url;
const sockets = [];

before(async () => {
  await connectDB('');
  await seed();
  server = http.createServer(app);
  initSocket(server);
  await new Promise((r) => server.listen(0, r));
  url = `http://localhost:${server.address().port}`;
});
after(async () => {
  sockets.forEach((s) => s.disconnect());
  server.closeAllConnections?.();
  await new Promise((r) => server.close(r));
  await disconnectDB();
});

async function call(method, path, { body, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(url + '/api' + path, { method, headers, body: body && JSON.stringify(body) });
  return { status: res.status, data: res.status === 204 ? null : await res.json(), headers: res.headers };
}
async function login(email, password) {
  const r = await call('POST', '/auth/login', { body: { email, password } });
  assert.strictEqual(r.status, 200);
  return { cookie: r.headers.get('set-cookie').split(';')[0], user: r.data.user };
}
function connect(cookie) {
  return new Promise((resolve, reject) => {
    const s = ioc(url, { extraHeaders: cookie ? { Cookie: cookie } : {}, transports: ['websocket'], reconnection: false });
    sockets.push(s);
    s.on('connect', () => resolve(s));
    s.on('connect_error', reject);
  });
}
const once = (s, ev, ms = 3000) =>
  new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`timeout waiting for ${ev}`)), ms);
    s.once(ev, (d) => { clearTimeout(t); resolve(d); });
  });

let admin, member, newbie, adminSock, memberSock, newbieSock;

test('auth: register, login, roles', async () => {
  const r = await call('POST', '/auth/register', { body: { name: 'Nina New', email: 'nina@test.com', password: 'secret123' } });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.data.user.role, 'member');
  newbie = { cookie: r.headers.get('set-cookie').split(';')[0], user: r.data.user };
  admin = await login(env.adminEmail, env.adminPassword);
  member = await login(env.demoEmail, env.demoPassword);
  assert.strictEqual((await call('GET', '/tasks')).status, 401);
  assert.strictEqual((await call('PATCH', `/users/${newbie.user._id}/role`, { cookie: member.cookie, body: { role: 'admin' } })).status, 403);
});

test('socket: rejects unauthenticated, accepts cookie auth, tracks presence', async () => {
  await assert.rejects(connect(null), /Authentication required/);
  adminSock = await connect(admin.cookie);
  const joined = once(adminSock, 'presence:join');
  memberSock = await connect(member.cookie);
  assert.strictEqual((await joined).name, 'Max Member');
  newbieSock = await connect(newbie.cookie);
});

test('real-time task events + user-specific notifications', async () => {
  const created = once(memberSock, 'task:created');
  const notif = once(newbieSock, 'notification:new');
  const memberGotNotif = new Promise((r) => { memberSock.once('notification:new', () => r(true)); setTimeout(() => r(false), 500); });

  const r = await call('POST', '/tasks', { cookie: admin.cookie, body: { title: 'Ship v1', priority: 'high', assignee: newbie.user._id } });
  assert.strictEqual(r.status, 201);
  assert.strictEqual((await created).title, 'Ship v1');
  const n = await notif;
  assert.strictEqual(n.type, 'task_assigned');
  assert.match(n.text, /Ada Admin assigned you "Ship v1"/);
  assert.strictEqual(await memberGotNotif, false, 'notification must only go to the assignee');

  const taskId = r.data.data._id;
  // Assignee may change status only
  assert.strictEqual((await call('PATCH', `/tasks/${taskId}`, { cookie: newbie.cookie, body: { title: 'Hacked' } })).status, 403);
  assert.strictEqual((await call('PATCH', `/tasks/${taskId}`, { cookie: member.cookie, body: { status: 'done' } })).status, 403);
  const updated = once(adminSock, 'task:updated');
  const creatorNotif = once(adminSock, 'notification:new');
  assert.strictEqual((await call('PATCH', `/tasks/${taskId}`, { cookie: newbie.cookie, body: { status: 'in_progress' } })).status, 200);
  assert.strictEqual((await updated).status, 'in_progress');
  assert.match((await creatorNotif).text, /moved "Ship v1" to In progress/);

  const list = await call('GET', '/notifications', { cookie: newbie.cookie });
  assert.strictEqual(list.data.unread, 1);
  await call('PATCH', '/notifications/read-all', { cookie: newbie.cookie });
  assert.strictEqual((await call('GET', '/notifications', { cookie: newbie.cookie })).data.unread, 0);

  assert.strictEqual((await call('DELETE', `/tasks/${taskId}`, { cookie: newbie.cookie })).status, 403);
  const deleted = once(memberSock, 'task:deleted');
  assert.strictEqual((await call('DELETE', `/tasks/${taskId}`, { cookie: admin.cookie })).status, 204);
  assert.strictEqual((await deleted)._id, taskId);
});

test('chat: bidirectional messages, DMs are private, validation via ack', async () => {
  const got = once(adminSock, 'chat:message');
  const ack = await memberSock.emitWithAck('chat:send', { text: 'Hello team' });
  assert.ok(ack.ok);
  assert.strictEqual((await got).text, 'Hello team');

  const bad = await memberSock.emitWithAck('chat:send', { text: '   ' });
  assert.match(bad.error, /empty/);

  const dmForAdmin = once(adminSock, 'chat:message');
  const newbieSaw = new Promise((r) => { newbieSock.once('chat:message', () => r(true)); setTimeout(() => r(false), 500); });
  const dmNotif = once(adminSock, 'notification:new');
  const dm = await memberSock.emitWithAck('chat:send', { text: 'psst', to: admin.user._id });
  assert.ok(dm.ok);
  assert.strictEqual((await dmForAdmin).text, 'psst');
  assert.strictEqual((await dmNotif).type, 'direct_message');
  assert.strictEqual(await newbieSaw, false, 'DM must not reach third parties');

  const hist = await call('GET', `/messages?with=${member.user._id}`, { cookie: admin.cookie });
  assert.deepStrictEqual(hist.data.data.map((m) => m.text), ['psst']);
  const general = await call('GET', '/messages', { cookie: admin.cookie });
  assert.ok(general.data.data.some((m) => m.text === 'Hello team'));
});

test('seed: rotates demo passwords from env; refuses public defaults in production', async () => {
  const original = env.adminPassword;
  env.adminPassword = 'Rotated12345';
  await seed();
  assert.strictEqual((await call('POST', '/auth/login', { body: { email: env.adminEmail, password: original } })).status, 401);
  assert.strictEqual((await call('POST', '/auth/login', { body: { email: env.adminEmail, password: 'Rotated12345' } })).status, 200);
  env.adminPassword = original;
  await seed();
  assert.strictEqual((await call('POST', '/auth/login', { body: { email: env.adminEmail, password: original } })).status, 200);

  // Production without explicit passwords: seed does nothing (no default password applied)
  env.isProd = true;
  const saved = { a: process.env.ADMIN_PASSWORD, d: process.env.DEMO_PASSWORD };
  delete process.env.ADMIN_PASSWORD;
  delete process.env.DEMO_PASSWORD;
  env.adminPassword = 'ShouldNotApply1';
  await seed();
  env.isProd = false;
  env.adminPassword = original;
  if (saved.a !== undefined) process.env.ADMIN_PASSWORD = saved.a;
  if (saved.d !== undefined) process.env.DEMO_PASSWORD = saved.d;
  assert.strictEqual((await call('POST', '/auth/login', { body: { email: env.adminEmail, password: original } })).status, 200);
});

test('admin deletes a user → their sockets are disconnected', async () => {
  const dropped = once(newbieSock, 'disconnect');
  const left = once(adminSock, 'presence:leave');
  assert.strictEqual((await call('DELETE', `/users/${newbie.user._id}`, { cookie: admin.cookie })).status, 204);
  await dropped;
  assert.strictEqual((await left).id, newbie.user._id);
  assert.strictEqual((await call('GET', '/auth/me', { cookie: newbie.cookie })).status, 401);
});
