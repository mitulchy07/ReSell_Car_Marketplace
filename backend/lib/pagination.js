'use strict';
// Read Firestore cursor pages while preserving admin response formats.
const { getDb, FieldPath } = require('../firebase');
const { httpError, sendError } = require('../middleware/errors');
const { parseId } = require('./validate');
const { documents } = require('./listings');
/**
 * Return a validated cursor page for an admin collection.
 * @param {object} req
 * @param {object} res
 * @param {string} collectionName
 * @param {string} responseKey
 * @returns {Promise<object>}
 */
async function adminPage(req, res, collectionName, responseKey) {
  try {
    const count = Number(req.query.limit || 50);
    if (!Number.isInteger(count) || count < 1 || count > 100)
      throw httpError(400, 'Limit must be 1-100');
    const cursor = String(req.query.cursor || '');
    if (cursor)
      parseId(cursor, 'Invalid pagination cursor');
    let query = getDb().collection(collectionName).orderBy(FieldPath.documentId());
    if (cursor)
      query = query.startAfter(cursor);
    const snap = await query.limit(count + 1).get();
    const hasMore = snap.docs.length > count;
    const page = snap.docs.slice(0, count);
    return res.json({ [responseKey]: documents({ docs: page }),
      nextCursor: hasMore ? page[page.length - 1].id : null, limit: count });
  }
  catch (error) {
    return sendError(res, `GET /admin/${collectionName}`, error);
  }
}
module.exports = { adminPage };
