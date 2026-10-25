'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { available, reason, setupEmulator } = require('./support/emulator');

test('buyer cannot exceed 3 active reservations and cancellation releases a slot',
  { skip: !available && reason }, async () => {
    const ctx = await setupEmulator();
    try {
      const seller = await ctx.account('seller');
      const buyer = await ctx.account('buyer');
      const cars = await Promise.all(Array.from({ length: 5 }, () => ctx.car(seller)));
      const first = await Promise.all(cars.slice(0, 3).map(car => ctx.book(car, buyer)));
      assert.deepEqual(first.map(x => x.status), [201, 201, 201]);
      const fourth = await ctx.book(cars[3], buyer);
      assert.equal(fourth.status, 429);
      const cancelled = await ctx.request('POST', `/bookings/${first[0].body.order._id}/cancel`,
        { token: buyer.token });
      assert.equal(cancelled.status, 200);
      assert.equal((await ctx.book(cars[4], buyer)).status, 201);
    } finally { await ctx.close(); }
  });

test('simultaneous bookings cannot exceed buyer limit', { skip: !available && reason }, async () => {
  const ctx = await setupEmulator();
  try {
    const seller = await ctx.account('seller');
    const buyer = await ctx.account('buyer');
    const cars = await Promise.all(Array.from({ length: 5 }, () => ctx.car(seller)));
    const replies = await Promise.all(cars.map(car => ctx.book(car, buyer)));
    assert.equal(replies.filter(x => x.status === 201).length, 3);
    assert.equal(replies.filter(x => x.status === 429).length, 2);
  } finally { await ctx.close(); }
});
