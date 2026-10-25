'use strict';
// Create new owner listings pending admin moderation.
const express = require('express');
const { getDb } = require('../../firebase');
const { MAX_LISTINGS_PER_ACCOUNT } = require('../../config');
const { requireAuth } = require('../../middleware/auth');
const { httpError, sendError } = require('../../middleware/errors');
const { requireString, validateFuel, validatePower, validateLocation,
  validateMileage } = require('../../lib/validate');
const router = express.Router();
function validateNewListing(input) {
  const model = requireString(input.model, 'Model', 2, 120);
  const category = requireString(input.category, 'Brand', 2, 80).toLowerCase();
  if (!/^[a-z0-9 -]+$/.test(category))
    throw httpError(400, 'Invalid brand');
  const amount = Number(input.price);
  if (!Number.isFinite(amount) || amount < 1 || amount > 100000000)
    throw httpError(400, 'Invalid price');
  const description = requireString(input.description, 'Description', 20, 1500);
  const location = validateLocation(input.location);
  const phone = requireString(input.phone, 'Phone', 7, 32);
  if (!/^[+0-9 ()-]+$/.test(phone))
    throw httpError(400, 'Invalid phone number');
  const image = requireString(input.image, 'Photo URL', 10, 2048);
  try {
    const u = new URL(image);
    if (u.protocol !== 'https:')
      throw Error();
  }
  catch (_) {
    throw httpError(400, 'Photo must use a valid HTTPS URL');
  }
  const condition = String(input.condition || '').trim();
  if (!['Excellent', 'Good', 'Fair'].includes(condition))
    throw httpError(400, 'Invalid vehicle condition');
  const boughtdate = requireString(input.boughtdate, 'First purchased', 10, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(boughtdate) || Number.isNaN(Date.parse(boughtdate)) || boughtdate > new Date().toISOString().slice(0, 10)) {
    throw httpError(400, 'Invalid purchase date');
  }
  const mileage = validateMileage(input.mileage);
  const transmission = requireString(input.transmission, 'Transmission', 3, 30);
  if (!['Manual', 'Automatic'].includes(transmission))
    throw httpError(400, 'Invalid transmission');
  const year = requireString(input.year, 'Registration', 7, 7);
  if (!/^(0[1-9]|1[0-2])\/\d{4}$/.test(year))
    throw httpError(400, 'Registration must be MM/YYYY');
  const fuel = validateFuel(input.fuel);
  const powerKw = validatePower(input.powerKw, 'powerKw');
  const powerHp = validatePower(input.powerHp, 'powerHp');
  const sellerType = String(input.sellerType || '').trim();
  if (!['Professional', 'Private'].includes(sellerType))
    throw httpError(400, 'Invalid seller type');
  return { model, category, price: String(amount), description, location, phone, image,
    mileage, transmission, year, fuel, powerKw, powerHp, sellerType, condition, boughtdate };
}
// Reading inventory and writing the owner profile together serializes listing submissions.
async function createOwnedListing(db, ownerRef, listingRef, payload, user) {
  await db.runTransaction(async (transaction) => {
    const ownerSnap = await transaction.get(ownerRef);
    const existingListings = await transaction.get(db.collection('sell')
      .where('sellerUid', '==', user.uid).limit(MAX_LISTINGS_PER_ACCOUNT));
    if (ownerSnap.exists) {
      const profile = ownerSnap.data();
      if (profile.suspended === true || profile.deleted === true ||
        profile.deletionPending === true || profile.suspensionSyncPending === true) {
        throw httpError(403, 'Account suspended. Contact support.');
      }
    }
    if (existingListings.size >= MAX_LISTINGS_PER_ACCOUNT) {
      throw httpError(429, 'Maximum 25 listings per account');
    }
    // The owner write forces concurrent submissions to retry and recount before committing.
    if (ownerSnap.exists) {
      transaction.update(ownerRef, { listingQuotaGuard: listingRef.id });
    }
    else {
      transaction.create(ownerRef, {
        uid: user.uid, name: user.name || 'ReSell member',
        email: user.email || '', createdAt: new Date().toISOString(),
        listingQuotaGuard: listingRef.id
      });
    }
    transaction.create(listingRef, payload);
  }, { maxAttempts: 10 });
}
router.post('/sell', requireAuth, async (req, res) => {
  try {
    const validated = validateNewListing(req.body || {});
    const { category } = validated;
    const db = getDb();
    const categories = await db.collection('categories').get();
    const brands = categories.docs.map(d => String(d.data().name || d.data().category || d.id).toLowerCase());
    if (!brands.includes(category))
      throw httpError(400, 'Choose an existing marketplace brand');
    const user = req.firebaseUser;
    const ownerRef = db.collection('users').doc(user.uid);
    const now = new Date();
    const payload = {
      ...validated, email: user.email || '',
      sellername: String(user.name || user.email || 'Seller').slice(0, 80), sellerUid: user.uid,
      booked: false, sold: false, reported: false, advertise: false, verified: false,
      approvalStatus: 'pending', paused: false,
      postdate: now.toISOString().slice(0, 10), postedAt: now.toISOString()
    };
    const ref = db.collection('sell').doc();
    await createOwnedListing(db, ownerRef, ref, payload, user);
    return res.status(201).json({ acknowledged: true, insertedId: ref.id,
      listing: { ...payload, _id: ref.id } });
  }
  catch (error) {
    return sendError(res, 'POST /sell', error);
  }
});
module.exports = router;
