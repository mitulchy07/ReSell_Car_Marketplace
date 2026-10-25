'use strict';
// Verify that marketplace public projections do not expose owner contact details.
const test = require('node:test');
const assert = require('node:assert/strict');
const { isPublic, isBookable, toSafeRow, toPublicCar } = require('../lib/listings');
const base = Object.freeze({
  model: 'Avensis', category: 'toyota', price: '4000', approvalStatus: 'approved',
  sellerUid: 'owner_1', email: 'owner@example.test', phone: '+33123456789',
  internalNotes: 'private moderation note', rejectionReason: 'internal reason',
});

test('isPublic enforces hidden, paused, owner unavailable and approval flags', () => {
  assert.equal(isPublic(base), true);
  for (const update of [
    { hidden: true }, { paused: true }, { sellerUnavailable: true },
    { approvalStatus: 'pending' }, { approvalStatus: 'rejected' },
  ]) assert.equal(isPublic({ ...base, ...update }), false);
});

test('isBookable rejects demos, booked/sold, missing owner and non-public cars', () => {
  assert.equal(isBookable(base), true);
  for (const update of [
    { demo: true }, { booked: true }, { sold: true },
    { sellerUid: null }, { sellerUid: '' }, { paused: true },
    { approvalStatus: 'pending' },
  ]) assert.equal(isBookable({ ...base, ...update }), false);
});

test('toSafeRow and toPublicCar never expose contact information or internal IDs', () => {
  const row = { ...base, _id: 'public_1' };
  const snapshot = { id: row._id, data() { return row; } };
  for (const result of [toSafeRow(row), toPublicCar(snapshot), toPublicCar(snapshot, true)]) {
    assert.equal(result.bookable, true);
    for (const property of ['email', 'phone', 'sellerUid', 'internalNotes', 'rejectionReason']) {
      assert.equal(Object.hasOwn(result, property), false, `${property} leaked`);
    }
  }
});
