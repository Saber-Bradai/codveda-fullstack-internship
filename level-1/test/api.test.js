// Automated API tests (node:test). Run: npm test
const { test, before, after } = require('node:test');
const assert = require('node:assert');
const os = require('node:os');
const path = require('node:path');

process.env.DATA_FILE = path.join(os.tmpdir(), `codveda-l1-${Date.now()}.json`);
const app = require('../server');

let server, base;
before(() => new Promise((r) => { server = app.listen(0, () => { base = `http://localhost:${server.address().port}/api/products`; r(); }); }));
after(() => server.close());

const json = (method, body) => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

test('full CRUD flow', async () => {
  let res = await fetch(base);
  assert.strictEqual(res.status, 200);
  const initial = (await res.json()).count;

  res = await fetch(base, json('POST', { name: 'Test Lamp', price: 12.345, stock: 3 }));
  assert.strictEqual(res.status, 201);
  const { data: created } = await res.json();
  assert.strictEqual(created.price, 12.35);
  assert.strictEqual(created.category, 'General');

  res = await fetch(`${base}/${created.id}`);
  assert.strictEqual(res.status, 200);

  res = await fetch(`${base}/${created.id}`, json('PATCH', { stock: 10 }));
  assert.strictEqual((await res.json()).data.stock, 10);

  res = await fetch(`${base}/${created.id}`, json('PUT', { name: 'Desk Lamp', price: 15 }));
  assert.strictEqual((await res.json()).data.name, 'Desk Lamp');

  res = await fetch(`${base}?search=desk`);
  assert.strictEqual((await res.json()).count, 1);

  res = await fetch(`${base}/${created.id}`, { method: 'DELETE' });
  assert.strictEqual(res.status, 204);

  res = await fetch(base);
  assert.strictEqual((await res.json()).count, initial);
});

test('error handling', async () => {
  let res = await fetch(`${base}/does-not-exist`);
  assert.strictEqual(res.status, 404);

  res = await fetch(base, json('POST', { name: 'x', price: -1 }));
  assert.strictEqual(res.status, 422);
  const body = await res.json();
  assert.ok(body.details.name && body.details.price);

  res = await fetch(base, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{bad json' });
  assert.strictEqual(res.status, 400);

  res = await fetch(base.replace('products', 'nope'));
  assert.strictEqual(res.status, 404);
});
