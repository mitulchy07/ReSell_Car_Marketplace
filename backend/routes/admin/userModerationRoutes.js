'use strict';
// Manage account suspension, Firebase custom claims, and empty-account deletion.
const express = require('express');
const { getDb, getAuth, FieldPath } = require('../../firebase');
const { requireMarketplaceAdmin, isBootstrapAdminRecord,
  toDirectoryRow } = require('../../middleware/auth');
const { httpError, sendError } = require('../../middleware/errors');
const { parseId } = require('../../lib/validate');
const { documents } = require('../../lib/listings');
const { nowIso, writeAuditEvent } = require('../../lib/audit');
const router = express.Router();
// Normal-sized inventories and the suspension flag must commit atomically.
async function syncSellerSuspension(db, ref, id, profileUpdate, suspended, actorUid) {
  const snapshot = await db.collection('sell').where('sellerUid', '==', id).get();
  const toUpdate = snapshot.docs.filter(doc => doc.data().sellerUnavailable !== suspended);
  if (toUpdate.length <= 448) {
    await writeSuspension(db, ref, profileUpdate, suspended, actorUid, toUpdate, false);
  }
  else {
    await writeSuspension(db, ref, profileUpdate, suspended, actorUid, toUpdate, true);
    for (let offset = 0; offset < toUpdate.length; offset += 450) {
      const batch = db.batch();
      for (const doc of toUpdate.slice(offset, offset + 450)) {
        batch.update(doc.ref, { sellerUnavailable: suspended });
      }
      await batch.commit();
    }
    await ref.set({ suspensionSyncPending: false }, { merge: true });
  }
}
async function writeSuspension(db, ref, profileUpdate, suspended, actorUid, docs, pending) {
  // Keep the profile lock, listing visibility, and audit event consistent where possible.
  await db.runTransaction(async (transaction) => {
    const existing = await transaction.get(ref);
    if (existing.exists && existing.data().deleted)
      throw httpError(409, 'Account deleted');
    if (existing.exists && existing.data().suspensionSyncPending === true &&
      existing.data().suspended !== suspended) {
      throw httpError(409, 'Finish the pending suspension update before changing its status');
    }
    transaction.set(ref, pending ? { ...profileUpdate,
      suspensionSyncPending: true } : profileUpdate, { merge: true });
    if (!pending)
      for (const doc of docs) {
        transaction.update(doc.ref, { sellerUnavailable: suspended });
      }
    writeAuditEvent(db, transaction, 'admin-user-update', {
      userId: ref.id, field: 'suspended', value: suspended
    }, actorUid);
  });
}
router.get('/admin/users', requireMarketplaceAdmin, async (req, res) => {
  try {
    const count = Number(req.query.limit || 100);
    if (!Number.isInteger(count) || count < 1 || count > 100)
      throw httpError(400, 'Limit must be 1-100');
    const cursor = String(req.query.cursor || '');
    if (cursor)
      parseId(cursor, 'Invalid pagination cursor');
    let query = getDb().collection('users').orderBy(FieldPath.documentId());
    if (cursor)
      query = query.startAfter(cursor);
    const snap = await query.limit(count + 1).get();
    const hasMore = snap.docs.length > count;
    const page = snap.docs.slice(0, count);
    return res.json({ users: documents({ docs: page }).map(u => ({ uid: u.uid || u._id,
      name: u.name || '', email: u.email || '', suspended: u.suspended === true,
        updatedAt: u.updatedAt || '' })), limit: count,
          nextCursor: hasMore ? page[page.length - 1].id : null });
  }
  catch (err) {
    return sendError(res, 'GET /admin/users', err);
  }
});
router.patch('/admin/users/:id', requireMarketplaceAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id), input = req.body || {}, keys = Object.keys(input);
    if (id === req.firebaseUser.uid)
      throw httpError(403, 'Admins cannot change their own account');
    if (keys.length !== 1 || keys[0] !== 'suspended')
      throw httpError(400,
        'Only suspension is editable here; use /admin/users/:id/admin to manage administrators');
    if (keys[0] === 'suspended' && typeof input.suspended !== 'boolean')
      throw httpError(400, 'suspended must be boolean');
    const account = await getAuth().getUser(id);
    if (isBootstrapAdminRecord(account) || account.customClaims?.resellAdmin === true) {
      throw httpError(403, 'Cannot modify an administrator');
    }
    const db = getDb();
    const ref = db.collection('users').doc(id);
    const profileUpdate = {
      uid: id, email: account.email || '', name: account.displayName || 'ReSell member',
      suspended: input.suspended, updatedAt: nowIso(), suspensionSyncPending: false
    };
    await syncSellerSuspension(db, ref, id, profileUpdate, input.suspended, req.firebaseUser.uid);
    return res.json({ acknowledged: true, uid: id, [keys[0]]: input[keys[0]] });
  }
  catch (err) {
    return sendError(res, 'PATCH /admin/users/:id', err);
  }
});
router.get('/admin/users/directory', requireMarketplaceAdmin, async (req, res) => {
  try {
    const limit = Number(req.query.limit || 40);
    const pageToken = String(req.query.pageToken || '');
    if (!Number.isInteger(limit) || limit < 1 || limit > 100 || pageToken.length > 2000) {
      throw httpError(400, 'Invalid page size or pagination token');
    }
    const result = await getAuth().listUsers(limit, pageToken || undefined);
    const docs = result.users.length ? await getDb().getAll(...result.users.map(u => getDb().collection('users').doc(u.uid))) : [];
    const profiles = new Map(docs.filter(x => x.exists).map(x => [x.id, x.data()]));
    return res.json({ users: result.users.map(u => toDirectoryRow(u, profiles.get(u.uid))),
      nextPageToken: result.pageToken || null });
  }
  catch (e) {
    return sendError(res, 'GET /admin/users/directory', e);
  }
});
router.patch('/admin/users/:id/admin', requireMarketplaceAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (!req.body || typeof req.body.admin !== 'boolean' || Object.keys(req.body).length !== 1) {
      throw httpError(400, 'Expected { admin: boolean }');
    }
    if (id === req.firebaseUser.uid)
      throw httpError(403, 'You cannot change your own admin access');
    const auth = getAuth();
    const target = await auth.getUser(id);
    if (isBootstrapAdminRecord(target))
      throw httpError(403, 'Owner admins are managed via Vercel configuration');
    if (req.body.admin) {
      if (target.disabled)
        throw httpError(409, 'Reactivate this account before promoting it');
      // An admin cannot lift suspension through the administrator management route.
      const profile = await getDb().collection('users').doc(id).get();
      if (profile.exists && (profile.data().suspended === true ||
        profile.data().deleted === true || profile.data().deletionPending === true ||
        profile.data().suspensionSyncPending === true)) {
        throw httpError(409, 'Reactivate this account before promoting it');
      }
    }
    const claims = { ...(target.customClaims || {}) };
    if (req.body.admin)
      claims.resellAdmin = true;
    else
      delete claims.resellAdmin;
    await auth.setCustomUserClaims(id, claims);
    const db = getDb();
    const auditBatch = db.batch();
    writeAuditEvent(db, auditBatch, 'admin-access', { targetUid: id, admin: req.body.admin },
      req.firebaseUser.uid);
    await auditBatch.commit();
    return res.json({ acknowledged: true, uid: id, isAdmin: req.body.admin,
      message: 'Permission updated. The user may need to sign in again.' });
  }
  catch (e) {
    return sendError(res, 'PATCH /admin/users/:id/admin', e);
  }
});
// Delete only empty accounts. Never orphan vehicle listings or historical bookings.
router.delete('/admin/users/:id', requireMarketplaceAdmin, async (req, res) => {
  try {
    const id = parseId(req.params.id);
    if (id === req.firebaseUser.uid)
      throw httpError(403, 'You cannot delete your own account');
    const auth = getAuth();
    const record = await auth.getUser(id);
    if (isBootstrapAdminRecord(record))
      throw httpError(403, 'Owner admins cannot be deleted here');
    if (record.customClaims?.resellAdmin === true) {
      throw httpError(403, 'Administrators cannot be deleted here');
    }
    const email = String(record.email || '').toLowerCase();
    if (!email || String(req.body?.confirmEmail || '').trim().toLowerCase() !== email) {
      throw httpError(400, 'Type the account email to confirm deletion');
    }
    const db = getDb();
    const ref = db.collection('users').doc(id);
    const before = await ref.get();
    // Lock future authenticated writes through requireAuth's user-profile check.
    await ref.set({ suspended: true, deletionPending: true, updatedAt: nowIso() }, { merge: true });
    try {
      // Also blocks new Firebase logins and refreshes.
      await auth.updateUser(id, { disabled: true });
      const collections = [
        ['sell', 'sellerUid'], ['orders', 'buyerUid'], ['orders', 'sellerUid'], ['reports',
          'reporterUid']
      ];
      const refs = await Promise.all(collections.map(([coll,
        field]) => db.collection(coll).where(field, '==', id).limit(1).get()));
      if (refs.some(snap => !snap.empty))
        throw httpError(409,
          'Account has listings, bookings or reports. Suspend it instead to retain marketplace records.');
      await auth.deleteUser(id);
      // Keep a minimal tombstone for consistency and prevent any remaining cached token use.
      await ref.set({ uid: id, email: '', name: 'Deleted account', deleted: true,
        suspended: true, deletionPending: false, deletedAt: nowIso() });
      const auditBatch = db.batch();
      writeAuditEvent(db, auditBatch, 'admin-deleted-user', { targetUid: id }, req.firebaseUser.uid);
      await auditBatch.commit();
      return res.json({ acknowledged: true, uid: id, deleted: true });
    }
    catch (e) {
      // If Firebase Auth still contains the account, reverse this request's lock.
      let stillExists = false;
      try {
        await auth.getUser(id);
        stillExists = true;
      }
      catch (_) { /* deleted */ }
      if (stillExists) {
        if (!record.disabled)
          await auth.updateUser(id, { disabled: false }).catch(() => { });
        await ref.set({ suspended: before.exists ? before.data().suspended === true : false,
          deletionPending: false }, { merge: true }).catch(() => { });
      }
      throw e;
    }
  }
  catch (e) {
    return sendError(res, 'DELETE /admin/users/:id', e);
  }
});
module.exports = router;
