'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MAX_ACTIVE_RESERVATIONS, addReservation } = require('../lib/buyerReservationLimit');

test('maximum active reservations is three', () => {
  assert.equal(MAX_ACTIVE_RESERVATIONS, 3);
  const operations = [];
  const transaction = { update: (ref, data) => operations.push({ ref, data }) };
  const ledger = { ref: { id: 'buyer' }, exists: true, activeIds: ['one', 'two'] };
  addReservation(transaction, ledger, 'three');
  assert.deepEqual(operations[0].data.activeIds, ['one', 'two', 'three']);
  assert.throws(() => addReservation(transaction, { ...ledger, activeIds: ['one','two','three'] }, 'four'),
    error => error.status === 429 || error.statusCode === 429);
});
