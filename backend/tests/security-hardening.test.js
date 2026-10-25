'use strict';
// Security regression assertions carried forward unchanged from Step 1.
const test = require('node:test');
const assert = require('node:assert/strict');
const { harness } = require('./support/mockBackend');

test('promoted custom-claim admins cannot be deleted', async () => {
  const { state, request } = harness();
  state.authUsers.set('promoted', {
    email: 'promoted@example.test', customClaims: { resellAdmin: true }
  });
  state.users.set('promoted', { uid: 'promoted' });
  const result = await request('delete', '/admin/users/:id', 'root',
    { id: 'promoted' }, { confirmEmail: 'promoted@example.test' });
  assert.equal(result.statusCode, 403);
  assert.equal(result.body.error, 'Administrators cannot be deleted here');
  assert.ok(state.authUsers.has('promoted'));
});

test('suspension is authoritative even on the next request', async () => {
  const { state, request } = harness();
  state.authUsers.set('alice', { email: 'alice@example.test' });
  state.users.set('alice', { uid: 'alice', suspended: false });
  let response = await request('get', '/myorders/:email', 'alice',
    { email: 'other@example.test' });
  assert.equal(response.statusCode, 403);
  state.users.set('alice', { uid: 'alice', suspended: true });
  response = await request('get', '/myorders/:email', 'alice',
    { email: 'other@example.test' });
  assert.equal(response.statusCode, 403);
  assert.equal(response.body.error, 'Account suspended. Contact support.');
});

test('small suspension updates the profile and owned listings together', async () => {
  const { state, request } = harness();
  state.authUsers.set('seller1', { email: 'seller1@example.test' });
  state.users.set('seller1', { uid: 'seller1' });
  state.sell.set('listing1', { sellerUid: 'seller1' });
  state.sell.set('listing2', { sellerUid: 'seller1' });
  const response = await request('patch', '/admin/users/:id', 'root',
    { id: 'seller1' }, { suspended: true });
  assert.equal(response.statusCode, 200);
  assert.equal(state.users.get('seller1').suspended, true);
  assert.equal(state.sell.get('listing1').sellerUnavailable, true);
  assert.equal(state.sell.get('listing2').sellerUnavailable, true);
  assert.equal(state.users.get('seller1').suspensionSyncPending, false);
});

test('large interrupted suspension remains locked and a retry repairs it', async () => {
  const { state, request } = harness();
  state.authUsers.set('seller2', { email: 'seller2@example.test' });
  state.users.set('seller2', { uid: 'seller2' });
  for (let i = 0; i < 451; i++) {
    state.sell.set(`listing${i}`, { sellerUid: 'seller2' });
  }
  state.failBatchNumber = 2;
  let response = await request('patch', '/admin/users/:id', 'root',
    { id: 'seller2' }, { suspended: true });
  assert.equal(response.statusCode, 500);
  assert.equal(state.users.get('seller2').suspensionSyncPending, true);
  state.failBatchNumber = 0;
  response = await request('patch', '/admin/users/:id', 'root',
    { id: 'seller2' }, { suspended: true });
  assert.equal(response.statusCode, 200);
  assert.equal(state.users.get('seller2').suspensionSyncPending, false);
  assert.equal(state.users.get('seller2').suspended, true);
  assert.equal([...state.sell.values()].filter(car => car.sellerUnavailable === true).length, 451);
});

test('unsuspending restores owned listing visibility and access', async () => {
  const { state, request } = harness();
  state.authUsers.set('seller3', { email: 'seller3@example.test' });
  state.users.set('seller3', { uid: 'seller3', suspended: true });
  state.sell.set('listing3', { sellerUid: 'seller3', sellerUnavailable: true });
  const response = await request('patch', '/admin/users/:id', 'root',
    { id: 'seller3' }, { suspended: false });
  assert.equal(response.statusCode, 200);
  assert.equal(state.users.get('seller3').suspended, false);
  assert.equal(state.sell.get('listing3').sellerUnavailable, false);
});

test('cannot reverse a partially completed suspension before repairing it', async () => {
  const { state, request } = harness();
  state.authUsers.set('seller4', { email: 'seller4@example.test' });
  state.users.set('seller4', {
    uid: 'seller4', suspended: true, suspensionSyncPending: true
  });
  state.sell.set('listing4', { sellerUid: 'seller4', sellerUnavailable: true });
  const response = await request('patch', '/admin/users/:id', 'root',
    { id: 'seller4' }, { suspended: false });
  assert.equal(response.statusCode, 409);
  assert.equal(state.users.get('seller4').suspended, true);
});


test('disabled Firebase Auth account cannot use an old valid token', async () => {
  const { state, request } = harness();
  state.authUsers.set('disabledUser', { email: 'disabled@example.test', disabled: true });
  state.users.set('disabledUser', { uid: 'disabledUser', suspended: false });
  const response = await request('get', '/seller/orders', 'disabledUser');
  assert.equal(response.statusCode, 401);
  assert.equal(response.body.error, 'Invalid or expired Firebase ID token');
});

test('suspended member cannot be promoted before reactivation', async () => {
  const { state, request } = harness();
  state.authUsers.set('inactiveUser', { email: 'inactive@example.test' });
  state.users.set('inactiveUser', { uid: 'inactiveUser', suspended: true });
  const response = await request('patch', '/admin/users/:id/admin', 'root',
    { id: 'inactiveUser' }, { admin: true });
  assert.equal(response.statusCode, 409);
  assert.equal(response.body.error, 'Reactivate this account before promoting it');
  assert.notEqual(state.authUsers.get('inactiveUser').customClaims?.resellAdmin, true);
});
