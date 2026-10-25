'use strict';
// Mount administrative routers without changing their absolute URLs.
const express = require('express');
const router = express.Router();
router.use(require('./admin/overviewRoutes'));
router.use(require('./admin/listingModerationRoutes'));
router.use(require('./admin/orderModerationRoutes'));
router.use(require('./admin/userModerationRoutes'));
router.use(require('./admin/reportModerationRoutes'));
module.exports = router;
