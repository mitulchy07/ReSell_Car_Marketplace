'use strict';
// Configure CORS, owner-admin allowlists, and shared vehicle enums.
require('dotenv').config();
const CORS_ORIGINS = [
  'https://assignment-12-33d2b.web.app',
  'https://assignment-12-33d2b.firebaseapp.com',
  'http://localhost:3000',
];
const ADMIN_UID_SET = new Set((process.env.ADMIN_UIDS || '').split(',').map(v => v.trim()).filter(Boolean));
const ADMIN_EMAIL_SET = new Set((process.env.ADMIN_EMAILS || '').split(',').map(v => v.trim().toLowerCase()).filter(Boolean));
const ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;
const ALLOWED_FUELS = new Set(['Diesel', 'Petrol', 'Hybrid', 'Electric', 'LPG', 'Plug-in Hybrid']);
const MAX_LISTINGS_PER_ACCOUNT = 25;
module.exports = { CORS_ORIGINS, ADMIN_UID_SET, ADMIN_EMAIL_SET, ID_PATTERN, ALLOWED_FUELS, MAX_LISTINGS_PER_ACCOUNT };
