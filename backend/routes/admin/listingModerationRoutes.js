'use strict';
// Moderate listings and their approval status.
const express = require('express');
const { getDb } = require('../../firebase');
const { requireMarketplaceAdmin } = require('../../middleware/auth');
const { httpError, sendError } = require('../../middleware/errors');
const { parseId, requireString } = require('../../lib/validate');
const { nowIso, writeAuditEvent } = require('../../lib/audit');
const router = express.Router();
router.patch('/admin/listings/:id', requireMarketplaceAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id, 'Invalid listing ID');
    const change = req.body || {};
    const allowed = Object.keys(change);
    if (allowed.length !== 1 || !['hidden',
      'advertise'].includes(allowed[0]) || typeof change[allowed[0]] !== 'boolean') {
      throw httpError(400, 'Set exactly one boolean: hidden or advertise');
    }
    const db = getDb();
    const ref = db.collection('sell').doc(id);
    // A moderation action and its audit record must commit together.
    // Approval status and the matching audit record must remain consistent.
    await db.runTransaction(async (t) => {
      const snap = await t.get(ref);
      if (!snap.exists)
        throw httpError(404, 'Listing not found');
      const car = snap.data();
      if (change.advertise === true && (car.hidden || car.paused || car.booked || car.sold || car.approvalStatus === 'pending' || car.approvalStatus === 'rejected'))
        throw httpError(409, 'Cannot feature a hidden, reserved or sold listing');
      t.update(ref, { ...change, moderatedAt: new Date().toISOString() });
      writeAuditEvent(db, t, 'listing', { listingId: id, action: allowed[0],
        value: change[allowed[0]] }, req.firebaseUser.uid);
    });
    return res.json({ acknowledged: true, id, ...change });
  }
  catch (error) {
    return sendError(res, 'PATCH /admin/listings/:id', error);
  }
});
router.patch('/admin/listings/:id/review', requireMarketplaceAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id), status = req.body?.status;
    if (!['approved', 'rejected'].includes(status))
      throw httpError(400, 'Status must be approved or rejected');
    const reason = status === 'rejected' ? requireString(req.body?.reason, 'Reason', 5, 300) : '';
    const db = getDb(), ref = db.collection('sell').doc(id);
    await db.runTransaction(async (t) => {
      const car = await t.get(ref);
      if (!car.exists)
        throw httpError(404, 'Listing not found');
      if (car.data().sold || car.data().booked)
        throw httpError(409, 'Reserved/sold vehicles cannot be reviewed');
      t.update(ref, { approvalStatus: status, rejectionReason: reason, advertise: false,
        reviewedAt: nowIso() });
      writeAuditEvent(db, t, 'admin-review', { listingId: id, status, reason }, req.firebaseUser.uid);
    });
    return res.json({ acknowledged: true, id, approvalStatus: status });
  }
  catch (err) {
    return sendError(res, 'PATCH /admin/listings/:id/review', err);
  }
});
module.exports = router;
