'use strict';
// Protect editing, deletion, and availability changes by sellerUid ownership.
const express = require('express');
const { getDb } = require('../../firebase');
const { requireAuth } = require('../../middleware/auth');
const { httpError, sendError } = require('../../middleware/errors');
const { parseId, requireString, requireHttpsUrl, validateFuel, validatePower,
  validateLocation, validateMileage, ensureOwner } = require('../../lib/validate');
const { documents } = require('../../lib/listings');
const { nowIso, writeAuditEvent } = require('../../lib/audit');
const router = express.Router();
router.get('/myitems/:email', requireAuth, async (req, res) => {
  try {
    const email = String(req.firebaseUser.email || '').toLowerCase();
    if (!email || email !== String(req.params.email || '').toLowerCase()) {
      throw httpError(403, 'Cannot access another seller’s listings');
    }
    const snapshot = await getDb().collection('sell').where('sellerUid', '==',
      req.firebaseUser.uid).get();
    return res.json(documents(snapshot).sort((a,
      b) => String(b.postedAt || '').localeCompare(String(a.postedAt || ''))));
  }
  catch (error) {
    return sendError(res, 'GET /myitems/:email', error);
  }
});
router.delete('/myitems/:id', requireAuth, async (req, res) => {
  try {
    const id = String(req.params.id || '');
    parseId(id, 'Invalid listing ID');
    const db = getDb();
    const ref = db.collection('sell').doc(id);
    // Deletion must recheck ownership and reservation state at commit time.
    await db.runTransaction(async (t) => {
      const snapshot = await t.get(ref);
      if (!snapshot.exists)
        throw httpError(404, 'Listing not found');
      const listing = snapshot.data();
      ensureOwner(listing, req.firebaseUser);
      if (listing.booked || listing.sold)
        throw httpError(409, 'Reserved or sold listings cannot be deleted');
      t.delete(ref);
    });
    return res.json({ acknowledged: true, deletedCount: 1 });
  }
  catch (error) {
    return sendError(res, 'DELETE /myitems/:id', error);
  }
});
router.patch('/myitems/:id', requireAuth, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    const input = req.body || {};
    const allowed = ['model', 'price', 'description', 'location', 'condition', 'image',
      'images', 'phone', 'mileage', 'transmission', 'year', 'fuel', 'powerKw', 'powerHp',
        'sellerType'];
    const keys = Object.keys(input);
    if (!keys.length || keys.some(k => !allowed.includes(k)))
      throw httpError(400, 'Please submit only allowed vehicle fields');
    const updates = {};
    for (const key of keys) {
      if (key === 'image')
        updates.image = requireHttpsUrl(input.image);
      else if (key === 'images') {
        if (!Array.isArray(input.images) || input.images.length > 8)
          throw httpError(400, 'Maximum eight photos');
        updates.images = input.images.map(requireHttpsUrl);
      }
      else if (key === 'price') {
        const n = Number(input.price);
        if (!Number.isFinite(n) || n < 1 || n > 100000000)
          throw httpError(400, 'Invalid price');
        updates.price = String(n);
      }
      else if (key === 'mileage')
        updates.mileage = validateMileage(input.mileage);
      else if (key === 'powerKw' || key === 'powerHp')
        updates[key] = validatePower(input[key], key);
      else if (key === 'condition') {
        if (!['Excellent', 'Good', 'Fair'].includes(input.condition))
          throw httpError(400, 'Invalid condition');
        updates.condition = input.condition;
      }
      else if (key === 'transmission') {
        if (!['Manual', 'Automatic'].includes(input.transmission))
          throw httpError(400, 'Invalid transmission');
        updates.transmission = input.transmission;
      }
      else if (key === 'fuel')
        updates.fuel = validateFuel(input.fuel);
      else if (key === 'sellerType') {
        if (!['Private', 'Professional'].includes(input.sellerType))
          throw httpError(400, 'Invalid seller type');
        updates.sellerType = input.sellerType;
      }
      else if (key === 'year') {
        if (typeof input.year !== 'string' || !/^(0[1-9]|1[0-2])\/\d{4}$/.test(input.year))
          throw httpError(400, 'Registration must be MM/YYYY');
        updates.year = input.year;
      }
      else if (key === 'phone') {
        const phone = requireString(input.phone, 'Phone', 7, 32);
        if (!/^[+0-9 ()-]+$/.test(phone))
          throw httpError(400, 'Invalid phone');
        updates.phone = phone;
      }
      else if (key === 'location')
        updates.location = validateLocation(input.location);
      else
        updates[key] = requireString(input[key], key, key === 'description' ? 20 : 2,
          key === 'description' ? 1500 : 120);
    }
    const db = getDb();
    const ref = db.collection('sell').doc(id);
    // Editing and removing promotion eligibility happen in one transaction.
    const result = await db.runTransaction(async (t) => {
      const doc = await t.get(ref);
      if (!doc.exists)
        throw httpError(404, 'Listing not found');
      const car = doc.data();
      ensureOwner(car, req.firebaseUser);
      if (car.booked || car.sold)
        throw httpError(409, 'Cannot edit a reserved or sold car');
      if (car.hidden)
        throw httpError(409, 'Ask an admin to restore this hidden listing before editing');
      const next = { ...updates, updatedAt: nowIso(), approvalStatus: 'pending', advertise: false };
      t.update(ref, next);
      writeAuditEvent(db, t, 'seller-edited-listing', { listingId: id, fields: keys },
        req.firebaseUser.uid);
      return next;
    });
    return res.json({ acknowledged: true, id, updates: result });
  }
  catch (err) {
    return sendError(res, 'PATCH /myitems/:id', err);
  }
});
router.patch('/myitems/:id/availability', requireAuth, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!req.body || typeof req.body.paused !== 'boolean' || Object.keys(req.body).length !== 1)
      throw httpError(400, 'Set paused to true or false');
    const db = getDb();
    const ref = db.collection('sell').doc(id);
    await db.runTransaction(async (t) => {
      const doc = await t.get(ref);
      if (!doc.exists)
        throw httpError(404, 'Listing not found');
      const car = doc.data();
      ensureOwner(car, req.firebaseUser);
      if (car.sold)
        throw httpError(409, 'Sold car cannot be changed');
      if (!req.body.paused && (car.booked || car.hidden || car.approvalStatus === 'pending' || car.approvalStatus === 'rejected'))
        throw httpError(409, 'Resolve reservation or moderation state first');
      t.update(ref, { paused: req.body.paused, updatedAt: nowIso() });
      writeAuditEvent(db, t, 'seller-availability', { listingId: id,
        paused: req.body.paused }, req.firebaseUser.uid);
    });
    return res.json({ acknowledged: true, id, paused: req.body.paused });
  }
  catch (err) {
    return sendError(res, 'PATCH /myitems/:id/availability', err);
  }
});
module.exports = router;
