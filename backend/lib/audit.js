'use strict';
// Record moderation events within their existing transaction or batch.
/**
 * Return the current ISO timestamp.
 * @returns {string}
 */
const nowIso = () => new Date().toISOString();
/**
 * Append an audit event to an existing write operation.
 * @param {object} db
 * @param {object} writer
 * @param {string} kind
 * @param {object} details
 * @param {string} uid
 * @returns {void}
 */
const writeAuditEvent = (db, t, kind, details, actorUid) => {
  t.create(db.collection('moderationEvents').doc(), {
    kind, ...details, actorUid, occurredAt: nowIso()
  });
};
module.exports = { nowIso, writeAuditEvent };
