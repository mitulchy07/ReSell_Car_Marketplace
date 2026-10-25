'use strict';
// Reserve and cancel vehicles for authenticated marketplace members.
const express = require('express');
const { getDb } = require('../firebase');
const { requireAuth } = require('../middleware/auth');
const { httpError, sendError } = require('../middleware/errors');
const { parseId } = require('../lib/validate');
const { documents, isPublic } = require('../lib/listings');
const { ID_PATTERN } = require('../config');
const { nowIso, writeAuditEvent } = require('../lib/audit');
const { assertTransition, assertReservationMatches } = require('../bookingPolicy');
const router = express.Router();
const { toBuyerOrder } = require('../lib/orderPrivacy');
const { loadLedger, addReservation, releaseReservation } = require('../lib/buyerReservationLimit');
// A vehicle can have at most one active reservation, even under concurrent requests.
async function reserveCar(db, carRef, orderRef, buyer, id) {
  return db.runTransaction(async (transaction) => {
    const snapshot = await transaction.get(carRef);
    if (!snapshot.exists)
      throw httpError(404, 'Car not found');
    const car = snapshot.data();
    if (!isPublic(car))
      throw httpError(409, 'Listing unavailable');
    if (car.demo === true)
      throw httpError(409, 'This showcase vehicle is not available for booking');
    if (typeof car.sellerUid !== 'string' || !ID_PATTERN.test(car.sellerUid)) {
      throw httpError(409, 'This showcase vehicle is not available for booking');
    }
    const sellerProfile = await transaction.get(db.collection('users').doc(car.sellerUid));
    if (!sellerProfile.exists || sellerProfile.data().suspended === true ||
      sellerProfile.data().deleted === true || sellerProfile.data().deletionPending === true) {
      throw httpError(409, 'Seller is not available to accept reservations');
    }
    if (car.booked === true || car.sold === true) {
      throw httpError(409, 'Car is already booked or sold');
    }
    if (car.sellerUid && car.sellerUid === buyer.uid) {
      throw httpError(403, 'You cannot book your own car');
    }
    if (buyer.email && car.email && buyer.email.toLowerCase() === String(car.email).toLowerCase()) {
      throw httpError(403, 'You cannot book your own car');
    }
    const ledger = await loadLedger(transaction, db, buyer.uid);
    const orderData = createOrderData(car, id, buyer);
    addReservation(transaction, ledger, orderRef.id);
    transaction.update(carRef, { booked: true, activeReservationId: orderRef.id });
    transaction.create(orderRef, orderData);
    return { ...orderData, _id: orderRef.id };
  });
}
function createOrderData(car, id, buyer) {
  const fields = [
    'model', 'price', 'location', 'description',
    'category', 'boughtdate', 'condition', 'image', 'postdate',
    'verified', 'advertise',
    'mileage', 'transmission', 'year', 'fuel', 'powerKw', 'powerHp', 'sellerType'
  ];
  const carData = {};
  for (const field of fields) {
    if (car[field] !== undefined)
      carData[field] = car[field];
  }
  return {
    ...carData, carId: id, buyerUid: buyer.uid,
    sellerUid: car.sellerUid || null,
    buyeremail: buyer.email || '',
    booked: true,
    bookedAt: new Date().toISOString(),
    status: 'pending',
  };
}
router.post('/bookings/:carId', requireAuth, async (req, res) => {
  try {
    const id = parseId(req.params.carId, 'Invalid listing ID');
    const db = getDb();
    const carRef = db.collection('sell').doc(id);
    const orderRef = db.collection('orders').doc();
    const buyer = req.firebaseUser;
    const order = await reserveCar(db, carRef, orderRef, buyer, id);
    return res.status(201).json({ message: 'Reservation request received', order: toBuyerOrder(order) });
  }
  catch (error) {
    return sendError(res, '/bookings/:id', error);
  }
});
// A logged-in user can only view their own orders. No client-supplied UID trusted.
router.get('/myorders/:email', requireAuth, async (req, res) => {
  try {
    const tokenEmail = String(req.firebaseUser.email || '').toLowerCase();
    const requestedEmail = String(req.params.email || '').toLowerCase();
    if (!tokenEmail || tokenEmail !== requestedEmail) {
      throw httpError(403, 'Cannot access another user’s orders');
    }
    const snapshot = await getDb().collection('orders')
      .where('buyerUid', '==', req.firebaseUser.uid).get();
    return res.json(documents(snapshot).map(toBuyerOrder));
  }
  catch (error) {
    return sendError(res, '/myorders/:email', error);
  }
});
router.post('/bookings/:orderId/cancel', requireAuth, async (req, res) => {
  try {
    const id = parseId(req.params.orderId);
    const db = getDb();
    const orderRef = db.collection('orders').doc(id);
    // Cancellation must update the order and vehicle together to release exactly one reservation.
    const updated = await db.runTransaction(async (t) => {
      const orderDoc = await t.get(orderRef);
      if (!orderDoc.exists)
        throw httpError(404, 'Reservation not found');
      const order = orderDoc.data();
      if (order.buyerUid !== req.firebaseUser.uid)
        throw httpError(403, 'Only the buyer can cancel this reservation');
      assertTransition(order.status, 'buyer', 'cancel');
      const carRef = db.collection('sell').doc(parseId(order.carId));
      const carDoc = await t.get(carRef);
      if (!carDoc.exists)
        throw httpError(409, 'Vehicle not found');
      if (carDoc.data().sold === true)
        throw httpError(409, 'Sold vehicles cannot be released');
      if (carDoc.data().booked !== true)
        throw httpError(409, 'Vehicle reservation status is inconsistent');
      assertReservationMatches(carDoc.data(), id);
      await releaseReservation(t, db, order.buyerUid, id);
      t.update(orderRef, { status: 'cancelled', booked: false, cancelledAt: nowIso(),
        cancelledBy: 'buyer' });
      t.update(carRef, { booked: false, activeReservationId: null });
      writeAuditEvent(db, t, 'buyer-cancelled-reservation', { reservationId: id,
        carId: order.carId }, req.firebaseUser.uid);
      return { id, status: 'cancelled', carId: order.carId };
    });
    return res.json({ acknowledged: true, ...updated });
  }
  catch (err) {
    return sendError(res, 'POST /bookings/:id/cancel', err);
  }
});
module.exports = router;
