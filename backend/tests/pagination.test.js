'use strict';
// Exercise admin-page cursors with in-memory document snapshots only.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const rows = [1, 2, 3, 4].map(number => ({
  id: `item_${number}`, data() { return { value: number }; },
}));
let reads = 0;
function collection() {
  let lastId = null;
  let maxCount = 100;
  const query = {
    orderBy() { return this; },
    startAfter(value) { lastId = value; return this; },
    limit(value) { maxCount = value; return this; },
    async get() {
      reads++;
      const filtered = rows.filter(row => lastId === null || row.id > lastId);
      return { docs: filtered.slice(0, maxCount) };
    },
  };
  return query;
}
const firebasePath = path.resolve(__dirname, '../firebase.js');
require.cache[firebasePath] = {
  id: firebasePath, filename: firebasePath, loaded: true,
  exports: { getDb: () => ({ collection }), FieldPath: { documentId: () => '__name__' } },
};
const configPath = path.resolve(__dirname, '../config.js');
require.cache[configPath] = {
  id: configPath, filename: configPath, loaded: true,
  exports: { ID_PATTERN: /^[A-Za-z0-9_-]{1,128}$/, ALLOWED_FUELS: new Set() },
};
const { adminPage } = require('../lib/pagination');
function request(query) {
  const response = {
    statusCode: 200,
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  return { req: { query }, response };
}

test('adminPage returns cursor and requested document count', async () => {
  reads = 0;
  const { req, response } = request({ limit: '2' });
  await adminPage(req, response, 'sell', 'cars');
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body.cars.map(car => car._id), ['item_1', 'item_2']);
  assert.equal(response.body.nextCursor, 'item_2');
  assert.equal(reads, 1);
});

test('adminPage honors cursor and has no nextCursor after last page', async () => {
  const { req, response } = request({ limit: '2', cursor: 'item_2' });
  await adminPage(req, response, 'sell', 'cars');
  assert.deepEqual(response.body.cars.map(car => car._id), ['item_3', 'item_4']);
  assert.equal(response.body.nextCursor, null);
});

test('adminPage rejects invalid limits and cursors', async () => {
  for (const query of [{ limit: '0' }, { limit: '101' }, { limit: 'abc' }, { cursor: '../bad' }]) {
    const { req, response } = request(query);
    await adminPage(req, response, 'sell', 'cars');
    assert.equal(response.statusCode, 400);
    assert.equal(typeof response.body.error, 'string');
  }
});
