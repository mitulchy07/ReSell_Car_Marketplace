'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { toBuyerOrder } = require('../lib/orderPrivacy');
for (const status of ['pending', 'booked', 'declined', 'cancelled']) {
  test(`seller contact excluded for ${status} buyer orders`, () => {
    const order = { status, email: 'seller@example.org', phone: '+1234567', sellername: 'Seller', carId: 'abc' };
    assert.deepEqual(toBuyerOrder(order), { status, carId: 'abc' });
    assert.ok(order.email, 'projection should not modify stored record');
  });
}
for (const status of ['confirmed', 'completed']) {
  test(`seller contact present for ${status} buyer orders`, () => {
    const order = { status, email: 'seller@example.org', phone: '+1234567' };
    assert.deepEqual(toBuyerOrder(order), order);
  });
}
