// Integration tests against an in-memory MongoDB. Run: npm test
process.env.NODE_ENV = 'test';
delete process.env.MONGO_URI;

const { test, before, after } = require('node:test');
const assert = require('node:assert');
const app = require('../src/app');
const { connectDB, disconnectDB } = require('../src/config/db');
const seed = require('../src/seed');
const env = require('../src/config/env');
const Product = require('../src/models/Product');

let server, base;
before(async () => {
  await connectDB('');
  await seed();
  await new Promise((r) => (server = app.listen(0, r)));
  base = `http://localhost:${server.address().port}/api`;
});
after(async () => {
  server.close();
  await disconnectDB();
});

async function call(method, path, { body, token, cookie } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (cookie) headers.Cookie = cookie;
  const res = await fetch(base + path, { method, headers, body: body && JSON.stringify(body) });
  const data = res.status === 204 ? null : await res.json();
  return { status: res.status, data, headers: res.headers };
}

let userToken, adminToken, userId, categoryId, productId;

test('register hashes password and sets HTTP-only cookie', async () => {
  const r = await call('POST', '/auth/register', { body: { name: 'Jane', email: 'Jane@Test.com', password: 'secret123' } });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.data.user.email, 'jane@test.com');
  assert.strictEqual(r.data.user.role, 'user');
  assert.strictEqual(r.data.user.password, undefined);
  const cookie = r.headers.get('set-cookie');
  assert.match(cookie, /token=.+HttpOnly/i);
  userToken = r.data.token;
  userId = r.data.user._id;

  const User = require('../src/models/User');
  const stored = await User.findById(userId).select('+password');
  assert.notStrictEqual(stored.password, 'secret123');
  assert.match(stored.password, /^\$2[aby]\$12\$/);
});

test('register validation and duplicate email', async () => {
  let r = await call('POST', '/auth/register', { body: { name: 'J', email: 'bad', password: 'short' } });
  assert.strictEqual(r.status, 422);
  assert.ok(r.data.details.name && r.data.details.email && r.data.details.password);
  r = await call('POST', '/auth/register', { body: { name: 'Jane 2', email: 'jane@test.com', password: 'secret123' } });
  assert.strictEqual(r.status, 409);
});

test('login works with cookie and rejects bad credentials', async () => {
  let r = await call('POST', '/auth/login', { body: { email: 'jane@test.com', password: 'wrongpass1' } });
  assert.strictEqual(r.status, 401);
  r = await call('POST', '/auth/login', { body: { email: env.adminEmail, password: env.adminPassword } });
  assert.strictEqual(r.status, 200);
  adminToken = r.data.token;
  const cookie = r.headers.get('set-cookie').split(';')[0];
  r = await call('GET', '/auth/me', { cookie });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.data.user.role, 'admin');
});

test('protected routes require auth; admin routes require admin role', async () => {
  assert.strictEqual((await call('GET', '/auth/me')).status, 401);
  assert.strictEqual((await call('GET', '/auth/me', { token: 'garbage' })).status, 401);
  assert.strictEqual((await call('GET', '/users', { token: userToken })).status, 403);
  const r = await call('GET', '/users', { token: adminToken });
  assert.strictEqual(r.status, 200);
  assert.ok(r.data.data.every((u) => u.password === undefined));
  assert.strictEqual((await call('POST', '/categories', { token: userToken, body: { name: 'Audio' } })).status, 403);
});

test('admin creates category; users create products with relationships', async () => {
  let r = await call('POST', '/categories', { token: adminToken, body: { name: 'Audio Gear' } });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.data.data.slug, 'audio-gear');
  categoryId = r.data.data._id;
  assert.strictEqual((await call('POST', '/categories', { token: adminToken, body: { name: 'Audio Gear' } })).status, 409);

  r = await call('POST', '/products', { token: userToken, body: { name: 'Studio Headphones', price: 99, stock: 4, category: categoryId } });
  assert.strictEqual(r.status, 201);
  assert.strictEqual(r.data.data.category.name, 'Audio Gear');
  assert.strictEqual(r.data.data.createdBy.name, 'Jane');
  productId = r.data.data._id;

  r = await call('POST', '/products', { token: userToken, body: { name: 'X', price: -1, category: 'nope' } });
  assert.strictEqual(r.status, 422);
  r = await call('POST', '/products', { token: userToken, body: { name: 'Ghost', price: 1, category: '0123456789abcdef01234567' } });
  assert.strictEqual(r.status, 422);

  r = await call('GET', '/categories');
  assert.strictEqual(r.data.data.find((c) => c._id === categoryId).productCount, 1);
});

test('listing: text search, filters, pagination, index usage', async () => {
  let r = await call('GET', '/products?search=headphones');
  assert.strictEqual(r.data.total, 1);
  r = await call('GET', `/products?category=${categoryId}&maxPrice=50`);
  assert.strictEqual(r.data.total, 0);
  r = await call('GET', '/products?limit=2&page=1&sort=price');
  assert.strictEqual(r.data.data.length, 2);
  assert.ok(r.data.data[0].price <= r.data.data[1].price);
  assert.strictEqual((await call('GET', '/products?limit=500')).status, 422);

  const plan = await Product.find({ category: categoryId }).sort({ price: 1 }).explain('queryPlanner');
  assert.match(JSON.stringify(plan), /category_1_price_1/);
});

test('ownership + roles on update/delete', async () => {
  const other = await call('POST', '/auth/register', { body: { name: 'Bob', email: 'bob@test.com', password: 'secret123' } });
  const bobToken = other.data.token;
  assert.strictEqual((await call('PATCH', `/products/${productId}`, { token: bobToken, body: { price: 1 } })).status, 403);

  let r = await call('PATCH', `/products/${productId}`, { token: userToken, body: { price: 89 } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.data.data.price, 89);

  r = await call('POST', `/products/${productId}/reviews`, { token: bobToken, body: { rating: 4, comment: 'Nice' } });
  assert.strictEqual(r.status, 201);
  assert.strictEqual((await call('POST', `/products/${productId}/reviews`, { token: bobToken, body: { rating: 5 } })).status, 409);
  r = await call('GET', `/products/${productId}`);
  assert.strictEqual(r.data.data.ratingAvg, 4);

  assert.strictEqual((await call('DELETE', `/categories/${categoryId}`, { token: adminToken })).status, 409);
  assert.strictEqual((await call('DELETE', `/products/${productId}`, { token: adminToken })).status, 204); // admin override
  assert.strictEqual((await call('GET', `/products/${productId}`)).status, 404);
  assert.strictEqual((await call('GET', '/products/not-an-id')).status, 400);
});

test('admin can promote a user; logout clears cookie', async () => {
  let r = await call('PATCH', `/users/${userId}/role`, { token: adminToken, body: { role: 'admin' } });
  assert.strictEqual(r.status, 200);
  assert.strictEqual(r.data.data.role, 'admin');
  assert.strictEqual((await call('GET', '/users', { token: userToken })).status, 200); // role re-read from DB
  r = await call('POST', '/auth/logout');
  assert.match(r.headers.get('set-cookie'), /token=;/);
});
