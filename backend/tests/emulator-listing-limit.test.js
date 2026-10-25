'use strict';
// Check that legacy listing counts and concurrent submissions respect the owner quota.
const test = require('node:test');
const assert = require('node:assert/strict');
const { available, reason, setupEmulator } = require('./support/emulator');

const routeTest = available ? test : test.skip;
let fixture;
if (available) {
  test.before(async () => { fixture = await setupEmulator(); });
  test.after(async () => { if (fixture) await fixture.close(); });
}

const listingPayload = {
  model: 'Toyota Avensis', category: 'toyota', price: 4500,
  description: 'Well-maintained automatic family car', location: 'Mulhouse',
  phone: '+33123456789', image: 'https://example.com/photo.jpg',
  condition: 'Good', boughtdate: '2020-01-01', mileage: 65000,
  transmission: 'Automatic', year: '01/2012', fuel: 'Petrol',
  powerKw: 108, powerHp: 147, sellerType: 'Private',
};

routeTest('simultaneous submissions for the final listing slot return 201 and 429', async () => {
  const owner = await fixture.account('Quota owner');
  const categoryRef = fixture.track(fixture.db.collection('categories')
    .doc(fixture.docId('brand')));
  await categoryRef.set({ name: 'Toyota' });

  // Preexisting listings have no quota counter: the transaction must count them too.
  const previous = [];
  const batch = fixture.db.batch();
  for (let number = 0; number < 24; number++) {
    const listingRef = fixture.track(fixture.db.collection('sell')
      .doc(fixture.docId('legacy')));
    previous.push(listingRef);
    batch.set(listingRef, { sellerUid: owner.uid, booked: false, sold: false,
      approvalStatus: 'approved' });
  }
  await batch.commit();

  const results = await Promise.all([1, 2].map(() => fixture.request('POST', '/sell', {
    token: owner.token, body: listingPayload,
  })));
  assert.deepEqual(results.map(result => result.status).sort(), [201, 429],
    JSON.stringify(results.map(result => result.body)));
  const accepted = results.find(result => result.status === 201);
  const rejected = results.find(result => result.status === 429);
  assert.equal(rejected.body.error, 'Maximum 25 listings per account');
  assert.equal(accepted.body.listing.approvalStatus, 'pending');
  fixture.track(fixture.db.collection('sell').doc(accepted.body.insertedId));
  let listings = await fixture.db.collection('sell').where('sellerUid', '==', owner.uid).get();
  assert.equal(listings.size, 25);

  // Deleting a listing must release a slot without a separate counter migration.
  const deletion = await fixture.request('DELETE', `/myitems/${previous[0].id}`, {
    token: owner.token,
  });
  assert.equal(deletion.status, 200);
  const replacement = await fixture.request('POST', '/sell', {
    token: owner.token, body: listingPayload,
  });
  assert.equal(replacement.status, 201, JSON.stringify(replacement.body));
  fixture.track(fixture.db.collection('sell').doc(replacement.body.insertedId));
  listings = await fixture.db.collection('sell').where('sellerUid', '==', owner.uid).get();
  assert.equal(listings.size, 25);
});

if (!available) test('Listing quota emulator prerequisites', { skip: reason }, () => {});
