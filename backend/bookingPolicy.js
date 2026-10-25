'use strict';
// Define permitted reservation transitions and legacy reservation-link invariants.
const ALLOWED = Object.freeze({
  buyer: Object.freeze({ cancel: ['booked', 'pending', 'confirmed'] }),
  seller: Object.freeze({
    confirm: ['booked', 'pending'],
    decline: ['booked', 'pending', 'confirmed'],
    complete: ['confirmed'],
  }),
  admin: Object.freeze({
    cancel: ['booked', 'pending', 'confirmed'],
    complete: ['confirmed'],
  }),
});
function conflict(message) {
  return Object.assign(new Error(message), { status: 409 });
}
/**
 * Check that a reservation status transition is permitted.
 * @param {string} status
 * @param {string} actor
 * @param {string} action
 * @returns {void}
 */
function assertTransition(status, actor, action) {
  const validStatuses = ALLOWED[actor] && ALLOWED[actor][action];
  if (!validStatuses || !validStatuses.includes(status)) {
    throw conflict(`Cannot ${action} a reservation with status ${String(status || 'unknown')}`);
  }
}
/**
 * Ensure the active reservation identifier matches when available.
 * @param {object} car
 * @param {string} reservationId
 * @returns {void}
 */
function assertReservationMatches(car, reservationId) {
  // Legacy orders have no activeReservationId. The other ownership/status checks
  // still apply; newly made bookings receive an exact reservation link.
  if (car.activeReservationId && car.activeReservationId !== reservationId) {
    throw conflict('Another reservation is linked to this vehicle');
  }
}
module.exports = { ALLOWED, assertTransition, assertReservationMatches };
