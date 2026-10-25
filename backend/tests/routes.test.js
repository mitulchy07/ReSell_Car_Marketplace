'use strict';
// Check the assembled CommonJS app against all 35 Step 2 route signatures.
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./support/mockBackend');
const baseline = [
  'GET /',
  'GET /health',
  'GET /categories',
  'GET /category/:category',
  'GET /advertised',
  'POST /bookings/:carId',
  'GET /myorders/:email',
  'POST /users',
  'POST /sell',
  'GET /myitems/:email',
  'DELETE /myitems/:id',
  'GET /listings',
  'GET /listings/page',
  'GET /listings/:id',
  'GET /admin/me',
  'GET /admin/listings',
  'GET /admin/orders',
  'GET /admin/overview',
  'PATCH /admin/listings/:id',
  'PATCH /admin/orders/:orderId',
  'POST /bookings/:orderId/cancel',
  'GET /seller/orders',
  'PATCH /seller/orders/:orderId',
  'PATCH /myitems/:id',
  'PATCH /myitems/:id/availability',
  'GET /admin/users',
  'PATCH /admin/users/:id',
  'POST /reports/:id',
  'GET /admin/reports',
  'PATCH /admin/reports/:id',
  'GET /admin/audit',
  'PATCH /admin/listings/:id/review',
  'GET /admin/users/directory',
  'PATCH /admin/users/:id/admin',
  'DELETE /admin/users/:id',
];
test('the modular app retains every Step 2 route, method and URL', () => {
  const registered = harness().routes.map(({method, pattern}) => `${method.toUpperCase()} ${pattern}`);
  assert.deepEqual([...registered].sort(), [...baseline].sort());
  assert.equal(new Set(registered).size, 35);
  assert.ok(registered.indexOf('GET /listings/page') < registered.indexOf('GET /listings/:id'));
});
