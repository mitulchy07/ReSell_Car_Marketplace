'use strict';
const { httpError } = require('../middleware/errors');

const MAX_ACTIVE_RESERVATIONS = 3;
const ACTIVE_STATUSES = new Set(['pending', 'booked', 'confirmed']);
const collection = 'buyerReservationLimits';

// Read all relevant documents before any transaction writes. The first reservation
// initializes a ledger from historical orders, so existing buyers aren't reset to zero.
async function loadLedger(t, db, buyerUid) {
  const ref = db.collection(collection).doc(buyerUid);
  const snap = await t.get(ref);
  if (snap.exists) {
    const activeIds = snap.data().activeIds;
    if (!Array.isArray(activeIds) || !activeIds.every(id => typeof id === 'string')) {
      throw httpError(409, 'Reservation ledger requires repair');
    }
    return { ref, exists: true, activeIds };
  }
  const orders = await t.get(db.collection('orders').where('buyerUid', '==', buyerUid));
  const activeIds = orders.docs.filter(doc => ACTIVE_STATUSES.has(doc.data().status))
    .map(doc => doc.id);
  return { ref, exists: false, activeIds };
}

function addReservation(t, ledger, orderId) {
  if (ledger.activeIds.length >= MAX_ACTIVE_RESERVATIONS) {
    throw httpError(429, `Maximum ${MAX_ACTIVE_RESERVATIONS} active reservations allowed`);
  }
  const activeIds = [...ledger.activeIds, orderId];
  if (ledger.exists) t.update(ledger.ref, { activeIds });
  else t.create(ledger.ref, { activeIds });
}

async function releaseReservation(t, db, buyerUid, orderId) {
  if (typeof buyerUid !== 'string' || !buyerUid) return;
  const ref = db.collection(collection).doc(buyerUid);
  const snap = await t.get(ref);
  if (!snap.exists) return; // Pre-ledger order; first future booking rebuilds from orders.
  const ids = snap.data().activeIds;
  if (!Array.isArray(ids) || !ids.every(id => typeof id === 'string')) {
    throw httpError(409, 'Reservation ledger requires repair');
  }
  if (ids.includes(orderId)) t.update(ref, { activeIds: ids.filter(id => id !== orderId) });
}

module.exports = { MAX_ACTIVE_RESERVATIONS, loadLedger, addReservation, releaseReservation };
