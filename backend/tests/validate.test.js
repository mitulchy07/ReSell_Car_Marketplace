'use strict';
// Check listing field validation without accessing Firestore.
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

// Isolate the validators from dotenv and Firebase initialization.
const configPath = path.resolve(__dirname, '../config.js');
require.cache[configPath] = {
  id: configPath,
  filename: configPath,
  loaded: true,
  exports: {
    ID_PATTERN: /^[A-Za-z0-9_-]{1,128}$/,
    ALLOWED_FUELS: new Set(['Diesel', 'Petrol', 'Hybrid', 'Electric', 'LPG', 'Plug-in Hybrid']),
  },
};
const {
  parseId, requireString, requireHttpsUrl, validateFuel, validatePower,
  validateLocation, validateMileage, ensureOwner,
} = require('../lib/validate');

function invalid(handler, expectedStatus = 400) {
  assert.throws(handler, error => error.status === expectedStatus);
}

test('parseId accepts allowed 1–128 character IDs and optional error labels', () => {
  assert.equal(parseId('A-z_09'), 'A-z_09');
  assert.equal(parseId('a'.repeat(128)), 'a'.repeat(128));
  for (const value of ['', 'a'.repeat(129), 'bad/slash', ' spaces ', null]) {
    invalid(() => parseId(value));
  }
  assert.throws(() => parseId('bad space', 'Invalid listing ID'), /Invalid listing ID/);
});

test('requireString trims and enforces inclusive length boundaries', () => {
  assert.equal(requireString(' x ', 'Label', 1, 1), 'x');
  assert.equal(requireString('abc', 'Label', 2, 3), 'abc');
  for (const value of ['', 'a', 'abcd', 10, null]) invalid(() => requireString(value, 'Label', 2, 3));
});

test('requireHttpsUrl accepts HTTPS and rejects non-HTTPS, invalid and long URLs', () => {
  assert.equal(requireHttpsUrl('https://example.com/photo.jpg'), 'https://example.com/photo.jpg');
  for (const value of [
    'http://example.com/a', 'ftp://example.com/a', 'not a url',
    'https://localhost/a', 'https://' + 'a'.repeat(2040) + '.com',
  ]) invalid(() => requireHttpsUrl(value));
});

test('validateFuel allows exactly six supported fuel types', () => {
  for (const value of ['Diesel', 'Petrol', 'Hybrid', 'Electric', 'LPG', 'Plug-in Hybrid']) {
    assert.equal(validateFuel(value), value);
  }
  for (const value of ['', 'gas', 'hybrid', null, 'Diesel & Petrol']) {
    invalid(() => validateFuel(value));
  }
});

test('validatePower enforces both field bounds and rejects decimals', () => {
  for (const [field, max] of [['powerKw', 2000], ['powerHp', 2800]]) {
    assert.equal(validatePower(1, field), 1);
    assert.equal(validatePower(max, field), max);
    for (const value of [0, -1, max + 1, 1.5, 'NaN']) {
      invalid(() => validatePower(value, field));
    }
  }
});

test('validateLocation allows 2–100 characters', () => {
  assert.equal(validateLocation(' Paris '), 'Paris');
  assert.equal(validateLocation('ab'), 'ab');
  assert.equal(validateLocation('x'.repeat(100)), 'x'.repeat(100));
  for (const value of ['a', 'x'.repeat(101), undefined]) invalid(() => validateLocation(value));
});

test('validateMileage allows integer 0–1,500,000', () => {
  for (const value of [0, 1, 1500000, '100']) assert.equal(validateMileage(value), Number(value));
  for (const value of [-1, 1500001, 2.5, 'unknown', '', '   ', null, [], {}, true]) invalid(() => validateMileage(value));
});

test('ensureOwner rejects missing ownership and another user', () => {
  assert.doesNotThrow(() => ensureOwner({ sellerUid: 'owner' }, { uid: 'owner' }));
  invalid(() => ensureOwner({ sellerUid: 'owner' }, { uid: 'other' }), 403);
  invalid(() => ensureOwner({}, { uid: 'owner' }), 403);
});
