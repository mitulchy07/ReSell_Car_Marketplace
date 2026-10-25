'use strict';
// Provide admin summary statistics and paged inventory tables.
const express = require('express');
const { getDb } = require('../../firebase');
const { requireMarketplaceAdmin } = require('../../middleware/auth');
const { sendError } = require('../../middleware/errors');
const { adminPage } = require('../../lib/pagination');
const { documents } = require('../../lib/listings');
const router = express.Router();
router.get('/admin/me', requireMarketplaceAdmin, (_req, res) => res.json({ admin: true }));
router.get('/admin/listings', requireMarketplaceAdmin, (req, res) => adminPage(req, res,
  'sell', 'listings'));
router.get('/admin/orders', requireMarketplaceAdmin, (req, res) => adminPage(req, res,
  'orders', 'reservations'));
router.get('/admin/overview', requireMarketplaceAdmin, async (_req, res) => {
  try {
    const db = getDb();
    const [cars, orders, carCount, orderCount, userCount, hiddenCount, soldCount] = await Promise.all([
      db.collection('sell').limit(250).get(),
      db.collection('orders').limit(100).get(),
      db.collection('sell').count().get(),
      db.collection('orders').count().get(),
      db.collection('users').count().get(),
      db.collection('sell').where('hidden', '==', true).count().get(),
      db.collection('sell').where('sold', '==', true).count().get(),
    ]);
    const all = documents(cars);
    const reservations = documents(orders).sort((a,
      b) => String(b.bookedAt || '').localeCompare(String(a.bookedAt || '')));
    const sampled = carCount.data().count > all.length;
    // 'active', 'reserved' and 'featured' depend on intersecting legacy flags;
    // mark them partial above the page limit. Hidden and sold counts are exact.
    return res.json({
      stats: {
        listings: carCount.data().count,
        active: all.filter(c => !c.hidden && !c.sold && !c.booked).length,
        featured: all.filter(c => c.advertise === true && !c.hidden).length,
        hidden: hiddenCount.data().count,
        reserved: all.filter(c => c.booked === true && !c.sold).length,
        sold: soldCount.data().count,
        reservations: orderCount.data().count,
        users: userCount.data().count,
        partialActiveReserved: sampled,
        partialFeatured: sampled,
      },
      listings: all.sort((a,
        b) => String(b.postedAt || b.postdate || '').localeCompare(String(a.postedAt || a.postdate || ''))),
      reservations,
      limits: { listings: 250, reservations: 100,
        partial: sampled || orderCount.data().count > reservations.length },
    });
  }
  catch (error) {
    return sendError(res, 'GET /admin/overview', error);
  }
});
module.exports = router;
