'use strict';
// Process reservation status changes for vehicle owners.
const express = require('express');
const { getDb } = require('../../firebase');
const { requireAuth } = require('../../middleware/auth');
const { httpError, sendError } = require('../../middleware/errors');
const { parseId } = require('../../lib/validate');
const { documents } = require('../../lib/listings');
const { nowIso, writeAuditEvent } = require('../../lib/audit');
const { assertTransition, assertReservationMatches } = require('../../bookingPolicy');
const { releaseReservation } = require('../../lib/buyerReservationLimit');
const router = express.Router();
router.get('/seller/orders', requireAuth, async (req, res) => {
  try {
    const snapshot = await getDb().collection('orders').where('sellerUid', '==',
      req.firebaseUser.uid).get();
    return res.json(documents(snapshot).sort((a,
      b) => String(b.bookedAt || '').localeCompare(String(a.bookedAt || ''))));
  }
  catch (err) {
    return sendError(res, 'GET /seller/orders', err);
  }
});
router.patch('/seller/orders/:orderId', requireAuth, async (req, res) => {
  try {
    const id = parseId(req.params.orderId);
    const action = req.body && req.body.action;
    if (!['confirm', 'decline', 'complete'].includes(action))
      throw httpError(400, 'Allowed actions: confirm, decline, complete');
    const db = getDb();
    const orderRef = db.collection('orders').doc(id);
    // The order and the linked vehicle must transition as one unit.
    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(orderRef);
      if (!doc.exists)
        throw httpError(404, 'Reservation not found');
      const order = doc.data();
      if (order.sellerUid !== req.firebaseUser.uid)
        throw httpError(403, 'Not your reservation');
      const carRef = db.collection('sell').doc(parseId(order.carId));
      const carDoc = await t.get(carRef);
      if (!carDoc.exists || carDoc.data().sellerUid !== req.firebaseUser.uid)
        throw httpError(403, 'Vehicle ownership mismatch');
      if (carDoc.data().sold === true)
        throw httpError(409, 'This vehicle is already sold');
      assertTransition(order.status, 'seller', action);
      if (carDoc.data().booked !== true)
        throw httpError(409, 'Vehicle status changed; refresh and retry');
      assertReservationMatches(carDoc.data(), id);
      if (action !== 'confirm') await releaseReservation(t, db, order.buyerUid, id);
      const status = action === 'confirm' ? 'confirmed' : action === 'decline' ? 'declined' : 'completed';
      const orderUpdates = { status, booked: action !== 'decline', sellerUpdatedAt: nowIso() };
      if (action === 'confirm') {
        const vehicle = carDoc.data();
        orderUpdates.email = vehicle.email || '';
        orderUpdates.phone = vehicle.phone || '';
        orderUpdates.sellername = vehicle.sellername || '';
      }
      t.update(orderRef, orderUpdates);
      if (action === 'decline')
        t.update(carRef, { booked: false, activeReservationId: null });
      else if (action === 'complete')
        t.update(carRef, { booked: true, sold: true, advertise: false, activeReservationId: id });
      writeAuditEvent(db, t, 'seller-reservation', { reservationId: id, carId: order.carId,
        action }, req.firebaseUser.uid);
      return { id, status, carId: order.carId };
    });
    return res.json({ acknowledged: true, ...result });
  }
  catch (err) {
    return sendError(res, 'PATCH /seller/orders/:id', err);
  }
});
module.exports = router;
