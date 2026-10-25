'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { assertTransition, assertReservationMatches } = require('../bookingPolicy');

for (const [actor, action, statuses] of [
  ['buyer', 'cancel', ['booked', 'pending', 'confirmed']],
  ['seller', 'confirm', ['booked', 'pending']],
  ['seller', 'decline', ['booked', 'pending', 'confirmed']],
  ['seller', 'complete', ['confirmed']],
  ['admin', 'cancel', ['booked', 'pending', 'confirmed']],
  ['admin', 'complete', ['confirmed']],
]) {
  for (const status of statuses) {
    test(`${actor}: ${action} permitted from ${status}`, () => {
      assert.doesNotThrow(() => assertTransition(status, actor, action));
    });
  }
}
for (const [actor, action, status] of [
  ['admin','complete','pending'], ['admin','complete','booked'],
  ['seller','complete','pending'], ['seller','complete','booked'],
  ['seller','confirm','confirmed'], ['seller','decline','completed'],
  ['buyer','cancel','cancelled'], ['buyer','cancel','completed'],
  ['buyer','cancel','declined'], ['admin','cancel','sold'],
]) {
  test(`${actor}: ${action} rejected from ${status}`, () => {
    assert.throws(() => assertTransition(status, actor, action), { status:409 });
  });
}
test('new reservation link must match order', () => {
  assert.doesNotThrow(() => assertReservationMatches({activeReservationId:'A'}, 'A'));
  assert.throws(() => assertReservationMatches({activeReservationId:'B'}, 'A'), {status:409});
});
test('old listings without reservation ID still supported', () => {
  assert.doesNotThrow(() => assertReservationMatches({booked:true}, 'A'));
});
