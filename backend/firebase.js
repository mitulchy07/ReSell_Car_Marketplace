'use strict';
// Lazily initialize Firebase Admin using the existing credential fallback order.
const { getApps, initializeApp, cert, applicationDefault } = require('firebase-admin/app');
const { getFirestore, FieldPath } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');
let firestore;
/**
 * Lazily initialize and return the Firestore client.
 * @returns {import('firebase-admin/firestore').Firestore}
 */
function getDb() {
  if (firestore)
    return firestore;
  if (!getApps().length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      let credentials;
      try {
        credentials = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      }
      catch {
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_JSON: expected JSON');
      }
      initializeApp({ credential: cert(credentials) });
    }
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      initializeApp({ credential: applicationDefault() });
    }
    else {
      throw new Error('Firebase Admin credentials not configured');
    }
  }
  firestore = getFirestore();
  return firestore;
}
module.exports = { getDb, getAuth, FieldPath };
