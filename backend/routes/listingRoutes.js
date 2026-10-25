'use strict';
// Mount the member-owned listing and incoming reservation routers.
const express = require('express');
const router = express.Router();
router.use(require('./listings/createRoutes'));
router.use(require('./listings/manageRoutes'));
router.use(require('./listings/sellerOrderRoutes'));
module.exports = router;
