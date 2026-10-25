'use strict';
// Moderate reservation cancellation and completion.
const express = require('express');
const { getDb } = require('../../firebase');
const { requireMarketplaceAdmin } = require('../../middleware/auth');
const { httpError, sendError } = require('../../middleware/errors');
const { parseId } = require('../../lib/validate');
const { ID_PATTERN } = require('../../config');
const { writeAuditEvent } = require('../../lib/audit');
const { assertTransition, assertReservationMatches } = require('../../bookingPolicy');
const { releaseReservation } = require('../../lib/buyerReservationLimit');
const router = express.Router();
router.patch('/admin/orders/:orderId', requireMarketplaceAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.orderId, 'Invalid reservation ID');
    const action = req.body && req.body.action;
    if (!['cancel', 'complete'].includes(action))
      throw httpError(400, 'Action must be cancel or complete');
    const db = getDb();
    const ref = db.collection('orders').doc(id);
    // An admin transition updates the order and its car atomically.
    await db.runTransaction(async (t) => {
      const orderSnap = await t.get(ref);
      if (!orderSnap.exists)
        throw httpError(404, 'Reservation not found');
      const order = orderSnap.data();
      assertTransition(order.status, 'admin', action);
      if (!ID_PATTERN.test(String(order.carId || '')))
        throw httpError(409, 'Reservation has no valid car');
      const carRef = db.collection('sell').doc(order.carId);
      const carSnap = await t.get(carRef);
      if (!carSnap.exists)
        throw httpError(409, 'Vehicle no longer exists');
      const car = carSnap.data();
      if (car.sold === true)
        throw httpError(409, 'Sold vehicles cannot be changed');
      if (car.booked !== true)
        throw httpError(409, 'Vehicle reservation status is inconsistent');
      assertReservationMatches(car, id);
      await releaseReservation(t, db, order.buyerUid, id);
      t.update(carRef, action === 'cancel'
        ? { booked: false, activeReservationId: null }
        : { booked: true, sold: true, advertise: false, activeReservationId: id });
      t.update(ref, { booked: action === 'complete',
        status: action === 'cancel' ? 'cancelled' : 'completed',
          adminUpdatedAt: new Date().toISOString() });
      writeAuditEvent(db, t, 'reservation', { reservationId: id, carId: order.carId, action },
        req.firebaseUser.uid);
    });
    return res.json({ acknowledged: true, id,
      status: action === 'cancel' ? 'cancelled' : 'completed' });
  }
  catch (error) {
    return sendError(res, 'PATCH /admin/orders/:id', error);
  }
});
// Cancel a reservation; both car and order are updated atomically.
module.exports = router;
