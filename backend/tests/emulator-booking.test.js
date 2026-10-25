'use strict';
// Exercise booking transactions and ownership against the local emulators.
const test = require('node:test');
const assert = require('node:assert/strict');
const { available, reason, setupEmulator } = require('./support/emulator');
const routeTest = available ? test : test.skip;
let fixture;
if (available) {
  test.before(async () => { fixture = await setupEmulator(); });
  test.after(async () => { if (fixture) await fixture.close(); });
}

routeTest('two simultaneous bookings commit exactly one reservation', async () => {
  const seller = await fixture.account('Owner');
  const buyers = [await fixture.account('Buyer A'), await fixture.account('Buyer B')];
  const car = await fixture.car(seller);
  const results = await Promise.all(buyers.map(buyer => fixture.book(car, buyer)));
  assert.deepEqual(results.map(result => result.status).sort(), [201, 409]);
  const stored = (await car.get()).data();
  assert.equal(stored.booked, true);
  const winning = results.find(result => result.status === 201);
  assert.equal(stored.activeReservationId, winning.body.order._id);
});

routeTest('bookings reject missing owner UID, demo, own car, missing or suspended owner', async () => {
  const owner = await fixture.account('Owner');
  const buyer = await fixture.account('Buyer');
  const noProfile = await fixture.account('Owner without profile', { profile: false });
  const suspendedOwner = await fixture.account('Suspended owner', { suspended: true });
  const cases = [
    { label: 'no sellerUid', user: owner, change: { sellerUid: null }, code: 409 },
    { label: 'demo car', user: owner, change: { demo: true }, code: 409 },
    { label: 'missing profile', user: noProfile, change: {}, code: 409 },
    { label: 'suspended profile', user: suspendedOwner, change: {}, code: 409 },
  ];
  for (const item of cases) {
    const car = await fixture.car(item.user, item.change);
    const response = await fixture.book(car, buyer);
    assert.equal(response.status, item.code, item.label);
  }
  const own = await fixture.car(owner);
  const ownResponse = await fixture.book(own, owner);
  assert.equal(ownResponse.status, 403);
});

routeTest('bookings reject hidden, paused and pending listings', async () => {
  const seller = await fixture.account('Seller');
  const buyer = await fixture.account('Buyer');
  for (const change of [
    { hidden: true }, { paused: true }, { approvalStatus: 'pending' },
  ]) {
    const car = await fixture.car(seller, change);
    const result = await fixture.book(car, buyer);
    assert.equal(result.status, 409, JSON.stringify(change));
  }
});

routeTest('same unified user can post a listing and book another owner’s car', async () => {
  const member = await fixture.account('Unified member');
  const other = await fixture.account('Other owner');
  const brandRef = fixture.track(fixture.db.collection('categories').doc(fixture.docId('brand')));
  await brandRef.set({ name: 'Toyota' });
  const listingPayload = {
    model: 'Toyota Avensis', category: 'toyota', price: 4500,
    description: 'Well-maintained automatic family car', location: 'Mulhouse',
    phone: '+33123456789', image: 'https://example.com/photo.jpg',
    condition: 'Good', boughtdate: '2020-01-01', mileage: 65000,
    transmission: 'Automatic', year: '01/2012', fuel: 'Petrol',
    powerKw: 108, powerHp: 147, sellerType: 'Private',
  };
  const created = await fixture.request('POST', '/sell', {
    token: member.token, body: listingPayload,
  });
  assert.equal(created.status, 201, JSON.stringify(created.body));
  assert.equal(created.body.listing.approvalStatus, 'pending');
  fixture.track(fixture.db.collection('sell').doc(created.body.insertedId));
  const otherCar = await fixture.car(other);
  const booked = await fixture.book(otherCar, member);
  assert.equal(booked.status, 201);
  const forbiddenEdit = await fixture.request('PATCH', `/myitems/${otherCar.id}`, {
    token: member.token, body: { price: '4900' },
  });
  assert.equal(forbiddenEdit.status, 403);
  const forbiddenAvailability = await fixture.request('PATCH', `/myitems/${otherCar.id}/availability`, {
    token: member.token, body: { paused: true },
  });
  assert.equal(forbiddenAvailability.status, 403);
  const forbiddenDelete = await fixture.request('DELETE', `/myitems/${otherCar.id}`, {
    token: member.token,
  });
  assert.equal(forbiddenDelete.status, 403);
});

routeTest('seller completion and admin completion require confirmed reservation', async () => {
  const owner = await fixture.account('Owner');
  const buyer = await fixture.account('Buyer');
  const admin = await fixture.account('Admin', { admin: true });
  for (const actor of ['seller', 'admin']) {
    const car = await fixture.car(owner);
    const booked = await fixture.book(car, buyer);
    assert.equal(booked.status, 201);
    const id = booked.body.order._id;
    const path = actor === 'seller' ? `/seller/orders/${id}` : `/admin/orders/${id}`;
    const token = actor === 'seller' ? owner.token : admin.token;
    const initial = await fixture.request('PATCH', path, { token, body: {
      action: 'complete',
    } });
    assert.equal(initial.status, 409);
    const confirmed = await fixture.request('PATCH', `/seller/orders/${id}`, {
      token: owner.token, body: { action: 'confirm' },
    });
    assert.equal(confirmed.status, 200);
    const completed = await fixture.request('PATCH', path, { token, body: {
      action: 'complete',
    } });
    assert.equal(completed.status, 200);
    assert.equal((await car.get()).data().sold, true);
  }
});

routeTest('buyer cancellation atomically releases booking and activeReservationId', async () => {
  const seller = await fixture.account('Owner');
  const buyer = await fixture.account('Buyer');
  const car = await fixture.car(seller);
  const booked = await fixture.book(car, buyer);
  assert.equal(booked.status, 201);
  const orderId = booked.body.order._id;
  const cancelled = await fixture.request('POST', `/bookings/${orderId}/cancel`, {
    token: buyer.token,
  });
  assert.equal(cancelled.status, 200);
  const stored = (await car.get()).data();
  assert.equal(stored.booked, false);
  assert.equal(stored.activeReservationId, null);
  const order = (await fixture.db.collection('orders').doc(orderId).get()).data();
  assert.equal(order.status, 'cancelled');
});

routeTest('public pagination scans beyond hidden listings to fill requested page', async () => {
  const owner = await fixture.account('Listing owner');
  const prefix = fixture.docId('zz_page');
  const batch = fixture.db.batch();
  for (let number = 0; number < 80; number++) {
    const ref = fixture.track(fixture.db.collection('sell').doc(
      `${prefix}_${String(number).padStart(3, '0')}`,
    ));
    batch.set(ref, {
      sellerUid: owner.uid, approvalStatus: number % 4 === 0 ? 'approved' : 'pending',
      model: `Car ${number}`, category: 'toyota', price: '4500', booked: false, sold: false,
    });
  }
  await batch.commit();
  const response = await fixture.request('GET',
    `/listings/page?limit=10&cursor=${prefix}_000`);
  assert.equal(response.status, 200);
  assert.equal(response.body.items.length, 10);
  assert.equal(typeof response.body.nextCursor, 'string');
});

if (!available) test('Booking emulator prerequisites', { skip: reason }, () => {});
