'use strict';
// Review member reports and moderation history.
const express = require('express');
const { getDb } = require('../../firebase');
const { requireMarketplaceAdmin } = require('../../middleware/auth');
const { httpError, sendError } = require('../../middleware/errors');
const { parseId } = require('../../lib/validate');
const { documents } = require('../../lib/listings');
const { nowIso, writeAuditEvent } = require('../../lib/audit');
const { ID_PATTERN } = require('../../config');
const router = express.Router();
router.get('/admin/reports', requireMarketplaceAdmin, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('reports').orderBy('createdAt', 'desc').limit(100).get();
    const reports = documents(snap).sort((a,
      b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    // Preserve old report records: look up titles only for reports without snapshots.
    const missingIds = [...new Set(reports.filter(r => !r.listingTitle && ID_PATTERN.test(String(r.carId || ''))).map(r => r.carId))];
    const titles = new Map();
    if (missingIds.length) {
      const cars = await db.getAll(...missingIds.map(id => db.collection('sell').doc(id)));
      for (const car of cars)
        if (car.exists)
          titles.set(car.id,
            String(car.data().model || car.data().category || 'Vehicle').slice(0, 120));
    }
    return res.json({ reports: reports.map(r => ({
        ...r, listingId: r.carId,
        listingTitle: r.listingTitle || titles.get(r.carId) || `Listing ${r.carId || 'unavailable'}`
      })) });
  }
  catch (err) {
    return sendError(res, 'GET /admin/reports', err);
  }
});
router.patch('/admin/reports/:id', requireMarketplaceAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id), status = req.body?.status;
    if (!['resolved', 'dismissed'].includes(status) || Object.keys(req.body || {}).length !== 1)
      throw httpError(400, 'Invalid report status');
    const db = getDb(), ref = db.collection('reports').doc(id);
    // Close a report only once and record the decision in the same transaction.
    await db.runTransaction(async (t) => {
      const report = await t.get(ref);
      if (!report.exists)
        throw httpError(404, 'Report not found');
      if (report.data().status !== 'open')
        throw httpError(409, 'Report already closed');
      t.update(ref, { status, reviewedAt: nowIso(), reviewerUid: req.firebaseUser.uid });
      writeAuditEvent(db, t, 'admin-report', { reportId: id, status }, req.firebaseUser.uid);
    });
    return res.json({ acknowledged: true, id, status });
  }
  catch (err) {
    return sendError(res, 'PATCH /admin/reports/:id', err);
  }
});
router.get('/admin/audit', requireMarketplaceAdmin, async (req, res) => {
  try {
    const snap = await getDb().collection('moderationEvents').orderBy('occurredAt',
      'desc').limit(100).get();
    return res.json({ events: documents(snap) });
  }
  catch (err) {
    return sendError(res, 'GET /admin/audit', err);
  }
});
module.exports = router;
