'use strict';
// Upsert the signed-in user profile while preserving verification.
const express = require('express');
const { getDb } = require('../firebase');
const { requireAuth } = require('../middleware/auth');
const { sendError, httpError } = require('../middleware/errors');
const { requireString } = require('../lib/validate');
const router = express.Router();
router.post('/users', requireAuth, async (req, res) => {
  try {
    const user = req.firebaseUser;
    const name = requireString(req.body?.name ?? user.name ?? 'ReSell member', 'Name', 2, 80);
    const db = getDb();
    const ref = db.collection('users').doc(user.uid);
    // A repeated registration must not overwrite an administrator-approved verification flag.
    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(ref);
      if (existing.exists && (existing.data().suspended || existing.data().deleted || existing.data().deletionPending)) {
        throw httpError(403, 'Account unavailable');
      }
      const profile = { name, email: user.email || '', uid: user.uid,
        updatedAt: new Date().toISOString() };
      if (existing.exists)
        transaction.set(ref, profile, { merge: true });
      else
        transaction.create(ref, { ...profile, verified: false });
    });
    return res.status(201).json({ acknowledged: true });
  }
  catch (e) {
    return sendError(res, 'POST /users', e);
  }
});
module.exports = router;
