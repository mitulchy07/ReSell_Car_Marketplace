'use strict';
// Provide public browsing, categories, adverts, and listing pagination.
const express = require('express');
const { getDb, FieldPath } = require('../firebase');
const { httpError, sendError } = require('../middleware/errors');
const { parseId } = require('../lib/validate');
const { documents, isPublic, toPublicCar, toSafeRow } = require('../lib/listings');
const router = express.Router();
router.get('/', (_req, res) => res.type('text').send('Resell market Server is Running.'));
router.get('/health', (_req, res) => res.json({ status: 'ok', mode: 'firestore-marketplace' }));
router.get('/categories', async (_req, res) => {
  try {
    const snapshot = await getDb().collection('categories').get();
    return res.json(documents(snapshot));
  }
  catch (error) {
    return sendError(res, '/categories', error);
  }
});
router.get('/category/:category', async (req, res) => {
  try {
    const category = String(req.params.category || '').trim().toLowerCase();
    if (!category || category.length > 80) {
      throw httpError(400, 'Invalid category');
    }
    const snapshot = await getDb().collection('sell').where('category', '==', category).get();
    return res.json(documents(snapshot).filter(isPublic).map(toSafeRow));
  }
  catch (error) {
    return sendError(res, '/category/:category', error);
  }
});
router.get('/advertised', async (_req, res) => {
  try {
    const snapshot = await getDb().collection('sell').where('advertise', '==', true).get();
    return res.json(documents(snapshot).filter(isPublic).map(toSafeRow));
  }
  catch (error) {
    return sendError(res, '/advertised', error);
  }
});
router.get('/listings', async (_req, res) => {
  try {
    const snap = await getDb().collection('sell').get();
    const list = snap.docs.filter(doc => isPublic(doc.data())).map(doc => toPublicCar(doc));
    list.sort((a, b) => Number(b.advertise === true) - Number(a.advertise === true) || String(b.postedAt || b.postdate || '').localeCompare(String(a.postedAt || a.postdate || '')));
    res.set('Cache-Control', 'public, max-age=0, s-maxage=10, stale-while-revalidate=10');
    return res.json(list);
  }
  catch (error) {
    return sendError(res, 'GET /listings', error);
  }
});
// The original array response is retained because existing clients consume it directly.
router.get('/listings/page', async (req, res) => {
  try {
    const count = Number(req.query.limit || 24);
    if (!Number.isInteger(count) || count < 1 || count > 60)
      throw httpError(400, 'Limit must be 1-60');
    const cursor = String(req.query.cursor || '');
    if (cursor)
      parseId(cursor, 'Invalid pagination cursor');
    const items = [];
    let lastScanned = cursor;
    let collectionEnded = false;
    // Scan up to five Firestore pages; skipped private documents never consume a public slot.
    for (let read = 0; read < 5 && items.length < count; read++) {
      const batchLimit = Math.max(25, count - items.length + 1);
      let query = getDb().collection('sell').orderBy(FieldPath.documentId());
      if (lastScanned)
        query = query.startAfter(lastScanned);
      const snap = await query.limit(batchLimit).get();
      if (snap.empty) {
        collectionEnded = true;
        break;
      }
      let scanned = 0;
      for (const doc of snap.docs) {
        scanned++;
        lastScanned = doc.id;
        if (isPublic(doc.data()))
          items.push(toPublicCar(doc));
        if (items.length === count)
          break;
      }
      if (scanned === snap.docs.length && snap.docs.length < batchLimit)
        collectionEnded = true;
      // An unscanned look-ahead document proves a further page exists.
      if (items.length === count || collectionEnded)
        break;
    }
    res.set('Cache-Control', 'public, max-age=0, s-maxage=10');
    return res.json({ items, nextCursor: collectionEnded ? null : lastScanned || null, limit: count });
  }
  catch (error) {
    return sendError(res, 'GET /listings/page', error);
  }
});
router.get('/listings/:id', async (req, res) => {
  try {
    const id = parseId(req.params.id, 'Invalid listing ID');
    const car = await getDb().collection('sell').doc(id).get();
    if (!car.exists || !isPublic(car.data()))
      throw httpError(404, 'Listing not found');
    res.set('Cache-Control', 'public, max-age=0, s-maxage=20');
    return res.json(toPublicCar(car, true));
  }
  catch (error) {
    return sendError(res, 'GET /listings/:id', error);
  }
});
module.exports = router;
