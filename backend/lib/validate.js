'use strict';
// Validate identifiers and listing fields for all editing routes.
const { ID_PATTERN, ALLOWED_FUELS } = require('../config');
const { httpError } = require('../middleware/errors');
/**
 * Validate a trimmed string against length bounds.
 * @param {*} input
 * @param {string} name
 * @param {number} min
 * @param {number} max
 * @returns {string}
 */
function requireString(input, name, min, max) {
  const value = typeof input === 'string' ? input.trim() : '';
  if (value.length < min || value.length > max) {
    throw httpError(400, `${name} must be ${min}-${max} characters`);
  }
  return value;
}
/**
 * Validate a permitted fuel type.
 * @param {*} value
 * @returns {string}
 */
function validateFuel(value) {
  const fuel = requireString(value, 'Fuel', 3, 30);
  if (!ALLOWED_FUELS.has(fuel))
    throw httpError(400, 'Invalid fuel');
  return fuel;
}
/**
 * Validate a vehicle power field.
 * @param {*} value
 * @param {string} field
 * @returns {number}
 */
function validatePower(value, field) {
  const number = Number(value);
  const max = field === 'powerKw' ? 2000 : 2800;
  if (!Number.isInteger(number) || number < 1 || number > max)
    throw httpError(400, 'Invalid power');
  return number;
}
/**
 * Validate listing location length.
 * @param {*} value
 * @returns {string}
 */
function validateLocation(value) { return requireString(value, 'Location', 2, 100); }
/**
 * Validate whole-kilometer mileage bounds.
 * @param {*} value
 * @returns {number}
 */
function validateMileage(value) {
  if (typeof value !== 'number' && typeof value !== 'string')
    throw httpError(400, 'Invalid mileage in km');
  if (typeof value === 'string' && !/^\d+$/.test(value.trim()))
    throw httpError(400, 'Invalid mileage in km');
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 1500000)
    throw httpError(400, 'Invalid mileage in km');
  return number;
}
/**
 * Enforce owner-only listing mutations.
 * @param {object} data
 * @param {object} user
 * @returns {void}
 */
function ensureOwner(data, user) {
  if (!data || !data.sellerUid || data.sellerUid !== user.uid) {
    throw httpError(403, 'You can only manage your own listings');
  }
}
/**
 * Validate a Firestore document identifier.
 * @param {*} value
 * @param {string} label
 * @returns {string}
 */
function parseId(value, label = 'Invalid identifier') {
  const id = String(value || '');
  if (!ID_PATTERN.test(id))
    throw httpError(400, label);
  return id;
}
/**
 * Validate an HTTPS image URL.
 * @param {*} value
 * @returns {string}
 */
const requireHttpsUrl = value => {
  const v = requireString(value, 'Image URL', 10, 2048);
  try {
    const u = new URL(v);
    if (u.protocol !== 'https:' || !u.hostname.includes('.'))
      throw Error();
  }
  catch {
    throw httpError(400, 'Please supply a valid HTTPS image URL');
  }
  return v;
};
module.exports = { requireString, parseId, requireHttpsUrl, validateFuel, validatePower,
  validateLocation, validateMileage, ensureOwner };
