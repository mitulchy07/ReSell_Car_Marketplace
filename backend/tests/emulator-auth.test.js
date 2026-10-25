'use strict';
// Verify authenticated route access and unified account behavior against emulators.
const test = require('node:test');
const assert = require('node:assert/strict');
const { available, reason, setupEmulator } = require('./support/emulator');
const routeTest = available ? test : test.skip;
let fixture;

if (available) {
  test.before(async () => { fixture = await setupEmulator(); });
  test.after(async () => { if (fixture) await fixture.close(); });
}

routeTest('every private route returns 401 without a bearer token', async () => {
  const paths = [
    ['POST', '/bookings/testcar'], ['GET', '/myorders/nobody@example.test'],
    ['POST', '/bookings/testorder/cancel'], ['POST', '/users'], ['POST', '/sell'],
    ['GET', '/myitems/nobody@example.test'], ['DELETE', '/myitems/testcar'],
    ['PATCH', '/myitems/testcar'], ['PATCH', '/myitems/testcar/availability'],
    ['GET', '/seller/orders'], ['PATCH', '/seller/orders/testorder'],
    ['POST', '/reports/testcar'], ['GET', '/admin/me'], ['GET', '/admin/listings'],
    ['GET', '/admin/orders'], ['GET', '/admin/overview'],
    ['PATCH', '/admin/listings/testcar'], ['PATCH', '/admin/listings/testcar/review'],
    ['PATCH', '/admin/orders/testorder'], ['GET', '/admin/users'],
    ['PATCH', '/admin/users/testuid'], ['GET', '/admin/users/directory'],
    ['PATCH', '/admin/users/testuid/admin'], ['DELETE', '/admin/users/testuid'],
    ['GET', '/admin/reports'], ['PATCH', '/admin/reports/testreport'],
    ['GET', '/admin/audit'],
  ];
  for (const [method, path] of paths) {
    const response = await fixture.request(method, path);
    assert.equal(response.status, 401, `${method} ${path}: ${JSON.stringify(response.body)}`);
  }
});

routeTest('non-admin user receives 403 for every admin API', async () => {
  const buyer = await fixture.account('Regular user');
  const urls = [
    ['GET', '/admin/me'], ['GET', '/admin/listings'], ['GET', '/admin/orders'],
    ['GET', '/admin/overview'], ['PATCH', '/admin/listings/testcar'],
    ['PATCH', '/admin/listings/testcar/review'], ['PATCH', '/admin/orders/testorder'],
    ['GET', '/admin/users'], ['PATCH', '/admin/users/testuid'],
    ['GET', '/admin/users/directory'], ['PATCH', '/admin/users/testuid/admin'],
    ['DELETE', '/admin/users/testuid'], ['GET', '/admin/reports'],
    ['PATCH', '/admin/reports/testreport'], ['GET', '/admin/audit'],
  ];
  for (const [method, path] of urls) {
    const response = await fixture.request(method, path, { token: buyer.token });
    assert.equal(response.status, 403, `${method} ${path}: ${JSON.stringify(response.body)}`);
  }
});

routeTest('suspended account immediately receives 403 on private routes', async () => {
  const suspended = await fixture.account('Suspended member', { suspended: true });
  for (const path of ['/seller/orders', '/users']) {
    const response = await fixture.request(path === '/users' ? 'POST' : 'GET', path, {
      token: suspended.token, body: path === '/users' ? { name: 'Suspended Person' } : undefined,
    });
    assert.equal(response.status, 403);
  }
});

routeTest('upserting a unified profile ignores role and preserves admin verification', async () => {
  const member = await fixture.account('Profile member');
  const profile = fixture.db.collection('users').doc(member.uid);
  await profile.set({ verified: true }, { merge: true });
  for (const role of ['buyer', 'seller', 'admin']) {
    const response = await fixture.request('POST', '/users', {
      token: member.token, body: { name: 'Updated Profile', role },
    });
    assert.equal(response.status, 201);
    assert.deepEqual(response.body, { acknowledged: true });
  }
  const data = (await profile.get()).data();
  assert.equal(data.verified, true);
  assert.equal(data.name, 'Updated Profile');
  assert.equal(Object.hasOwn(data, 'role'), false);
});

routeTest('admin user-update API rejects client-sent role', async () => {
  const admin = await fixture.account('Moderator', { admin: true });
  const member = await fixture.account('User to manage');
  const response = await fixture.request('PATCH', `/admin/users/${member.uid}`, {
    token: admin.token, body: { role: 'seller' },
  });
  assert.equal(response.status, 400);
});

routeTest('suspending and unsuspending a seller hides and restores public listings', async () => {
  const admin = await fixture.account('Moderator', { admin: true });
  const seller = await fixture.account('Seller');
  const listing = await fixture.car(seller);
  const before = await fixture.request('GET', '/listings');
  assert.ok(before.body.some(car => car._id === listing.id));
  const suspend = await fixture.request('PATCH', `/admin/users/${seller.uid}`, {
    token: admin.token, body: { suspended: true },
  });
  assert.equal(suspend.status, 200);
  const hidden = await fixture.request('GET', '/listings');
  assert.equal(hidden.body.some(car => car._id === listing.id), false);
  const restricted = await fixture.request('GET', '/seller/orders', { token: seller.token });
  assert.equal(restricted.status, 403);
  const unsuspend = await fixture.request('PATCH', `/admin/users/${seller.uid}`, {
    token: admin.token, body: { suspended: false },
  });
  assert.equal(unsuspend.status, 200);
  const restored = await fixture.request('GET', '/listings');
  assert.ok(restored.body.some(car => car._id === listing.id));
});

routeTest('malformed JSON returns 400 with a JSON error body', async () => {
  const response = await fixture.request('POST', '/users', { body: '{ broken json' });
  assert.equal(response.status, 400);
  assert.deepEqual(response.body, { error: 'Invalid JSON body' });
});

if (!available) test('Auth and Firestore emulator prerequisites', { skip: reason }, () => {});
