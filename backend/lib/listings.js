'use strict';
// Project marketplace listings into safe public JSON shapes.
/**
 * Include document IDs in a Firestore result.
 * @param {object} snapshot
 * @returns {object[]}
 */
const documents = (snapshot) => snapshot.docs.map(doc => ({ ...doc.data(), _id: doc.id }));
/**
 * Check whether a listing accepts a reservation.
 * @param {object} car
 * @returns {boolean}
 */
function isBookable(car) {
  return isPublic(car) && typeof car.sellerUid === 'string' && car.sellerUid.length > 0 &&
    !car.booked && !car.sold && car.demo !== true;
}
/**
 * Project a listing into public detail fields.
 * @param {object} doc
 * @param {boolean} detail
 * @returns {object}
 */
function toPublicCar(doc, detail = false) {
  const data = doc.data();
  const fields = ['category', 'model', 'price', 'image', 'images', 'condition', 'location', 'description',
    'mileage', 'transmission', 'year', 'fuel', 'powerKw', 'powerHp', 'sellerType',
    'booked', 'sold', 'advertise', 'demo', 'postdate', 'postedAt', 'verified',
      'approvalStatus', 'paused'];
  if (detail)
    fields.push('sellername', 'boughtdate');
  const car = { _id: doc.id };
  for (const field of fields)
    if (data[field] !== undefined)
      car[field] = data[field];
  car.bookable = isBookable(data);
  return car;
}
/**
 * Project legacy listing data without contact or internal fields.
 * @param {object} car
 * @returns {object}
 */
function toSafeRow(car) {
  // Legacy category/advertised APIs must not expose owner email, phone, UID or internal review notes.
  const fields = ['_id', 'category', 'model', 'price', 'image', 'images', 'condition', 'location', 'description',
    'mileage', 'transmission', 'year', 'fuel', 'powerKw', 'powerHp', 'sellerType',
    'booked', 'sold', 'advertise', 'postdate', 'postedAt', 'verified', 'demo'];
  const safe = {};
  for (const key of fields)
    if (car[key] !== undefined)
      safe[key] = car[key];
  safe.bookable = isBookable(car);
  return safe;
}
/**
 * Check whether a listing is public.
 * @param {object} car
 * @returns {boolean}
 */
function isPublic(car) {
  return !car.hidden && !car.paused && !car.sellerUnavailable &&
    car.approvalStatus !== 'pending' && car.approvalStatus !== 'rejected';
}
module.exports = { documents, isPublic, isBookable, toPublicCar, toSafeRow };
