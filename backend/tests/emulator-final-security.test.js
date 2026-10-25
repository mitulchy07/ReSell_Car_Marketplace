'use strict';
// Verify disabled Auth tokens and account suspension before granting admin access.
const test = require('node:test');
const assert = require('node:assert/strict');
const { available, reason, setupEmulator } = require('./support/emulator');
const emulatorTest = available ? test : test.skip;
let fixture;
if (available) {
  test.before(async () => { fixture = await setupEmulator(); });
  test.after(async () => { if (fixture) await fixture.close(); });
}

emulatorTest('disabled Firebase Auth accounts cannot use existing ID tokens', async () => {
  const member = await fixture.account('Disabled member');
  await fixture.auth.updateUser(member.uid, { disabled: true });
  const result = await fixture.request('GET', '/seller/orders', { token: member.token });
  assert.equal(result.status, 401, JSON.stringify(result.body));
  assert.equal(result.body.error, 'Invalid or expired Firebase ID token');
});

emulatorTest('admin promotion rejects Firestore-suspended users until reactivated', async () => {
  const administrator = await fixture.account('Administrator', { admin: true });
  const member = await fixture.account('Suspended member', { suspended: true });
  const endpoint = `/admin/users/${member.uid}/admin`;
  const blocked = await fixture.request('PATCH', endpoint, {
    token: administrator.token, body: { admin: true },
  });
  assert.equal(blocked.status, 409, JSON.stringify(blocked.body));
  assert.equal((await fixture.auth.getUser(member.uid)).customClaims?.resellAdmin, undefined);
  const restore = await fixture.request('PATCH', `/admin/users/${member.uid}`, {
    token: administrator.token, body: { suspended: false },
  });
  assert.equal(restore.status, 200, JSON.stringify(restore.body));
  const promoted = await fixture.request('PATCH', endpoint, {
    token: administrator.token, body: { admin: true },
  });
  assert.equal(promoted.status, 200, JSON.stringify(promoted.body));
  assert.equal((await fixture.auth.getUser(member.uid)).customClaims?.resellAdmin, true);
});

if (!available) test('Final security emulator prerequisites', { skip: reason }, () => {});
