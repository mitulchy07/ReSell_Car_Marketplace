'use strict';
// Require Firebase authentication and fresh suspension/admin authorization.
const { getDb, getAuth } = require('../firebase');
const { ADMIN_UID_SET, ADMIN_EMAIL_SET } = require('../config');
const { sendError } = require('./errors');
// Access must reflect suspensions from other serverless instances immediately.
async function isAccountSuspended(uid) {
  const snapshot = await getDb().collection('users').doc(uid).get();
  const data = snapshot.exists ? snapshot.data() : {};
  return data.suspended === true || data.deleted === true ||
    data.deletionPending === true || data.suspensionSyncPending === true;
}
/**
 * Authenticate the Firebase token and live account status.
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 * @returns {Promise<*>}
 */
async function requireAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const match = /^Bearer\s+(\S+)$/i.exec(authorization);
  if (!match) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    getDb();
    // Revocation also rejects disabled Firebase Auth users before the profile lookup.
    req.firebaseUser = await getAuth().verifyIdToken(match[1], true);
    if (!req.firebaseUser.uid) {
      return res.status(401).json({ error: 'Invalid authentication token' });
    }
    if (await isAccountSuspended(req.firebaseUser.uid))
      return res.status(403).json({ error: 'Account suspended. Contact support.' });
    return next();
  }
  catch (error) {
    if (String(error.code || '').startsWith('auth/')) {
      return res.status(401).json({ error: 'Invalid or expired Firebase ID token' });
    }
    return sendError(res, 'authentication', error);
  }
}
function isMarketplaceAdmin(user) {
  return Boolean(user && (ADMIN_UID_SET.has(user.uid) || (user.email_verified === true && ADMIN_EMAIL_SET.has(String(user.email || '').toLowerCase()))));
}
/**
 * Restrict a route to an active administrator.
 * @param {object} req
 * @param {object} res
 * @param {Function} next
 * @returns {*}
 */
function requireMarketplaceAdmin(req, res, next) {
  return requireAuth(req, res, async () => {
    try {
      if (await hasLiveAdminAccess(req.firebaseUser))
        return next();
      return res.status(403).json({ error: 'Admin permission required' });
    }
    catch (e) {
      return sendError(res, 'admin authorization', e);
    }
  });
}
/**
 * Check whether an account has protected bootstrap access.
 * @param {object} record
 * @returns {boolean}
 */
function isBootstrapAdminRecord(record) {
  return ADMIN_UID_SET.has(record.uid) ||
    (record.emailVerified === true && ADMIN_EMAIL_SET.has(String(record.email || '').toLowerCase()));
}
async function hasLiveAdminAccess(decoded) {
  if (isMarketplaceAdmin(decoded))
    return true;
  const account = await getAuth().getUser(decoded.uid);
  return !account.disabled && account.customClaims?.resellAdmin === true;
}
/**
 * Project a Firebase Auth user into a directory row.
 * @param {object} account
 * @param {object} profile
 * @returns {object}
 */
function toDirectoryRow(account, profile) {
  const p = profile || {};
  const protectedAdmin = isBootstrapAdminRecord(account);
  return {
    uid: account.uid,
    name: account.displayName || p.name || 'ReSell member',
    email: account.email || p.email || '',
    createdAt: account.metadata?.creationTime || '',
    lastSignIn: account.metadata?.lastSignInTime || '',
    emailVerified: account.emailVerified === true,
    isAdmin: protectedAdmin || account.customClaims?.resellAdmin === true,
    protectedAdmin,
    suspended: account.disabled === true || p.suspended === true,
  };
}
module.exports = { requireAuth, requireMarketplaceAdmin, isBootstrapAdminRecord, toDirectoryRow };
