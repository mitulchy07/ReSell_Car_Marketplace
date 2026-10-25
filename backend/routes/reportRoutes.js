'use strict';
// Accept authenticated reports of public vehicle listings.
const express = require('express');
const crypto = require('crypto');
const { getDb } = require('../firebase');
const { requireAuth } = require('../middleware/auth');
const { httpError, sendError } = require('../middleware/errors');
const { parseId, requireString } = require('../lib/validate');
const { isPublic } = require('../lib/listings');
const { nowIso } = require('../lib/audit');
const router = express.Router();
router.post('/reports/:id', requireAuth, async (req, res) => {
  try {
    const id = parseId(req.params.id), reason = requireString(req.body?.reason, 'Reason', 10, 400);
    const db = getDb();
    const car = await db.collection('sell').doc(id).get();
    if (!car.exists || !isPublic(car.data()))
      throw httpError(404, 'Listing not found');
    const reportId = crypto.createHash('sha256').update(`${req.firebaseUser.uid}:${id}`).digest('hex');
    const ref = db.collection('reports').doc(reportId);
    const existing = await ref.get();
    if (existing.exists)
      throw httpError(409, 'You already reported this listing');
    await ref.create({ carId: id,
      listingTitle: String(car.data().model || car.data().category || 'Vehicle').slice(0,
        120), reason, reporterUid: req.firebaseUser.uid, status: 'open', createdAt: nowIso() });
    return res.status(201).json({ acknowledged: true, message: 'Report submitted for review' });
  }
  catch (err) {
    if (err.code === 6 || err.code === 'already-exists' || err.code === 'ALREADY_EXISTS')
      return res.status(409).json({ error: 'You already reported this listing' });
    return sendError(res, 'POST /reports/:id', err);
  }
});
module.exports = router;
