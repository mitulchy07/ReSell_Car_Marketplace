'use strict';
// Start isolated API fixtures against local Firestore and Auth emulators only.
const { once } = require('node:events');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const firestoreHost = process.env.FIRESTORE_EMULATOR_HOST;
const authHost = process.env.FIREBASE_AUTH_EMULATOR_HOST;
const isLocalHost = value => /^(localhost|127\.0\.0\.1|\[::1\]):\d{1,5}$/.test(value || '');
const available = Boolean(firestoreHost && authHost && isLocalHost(firestoreHost) && isLocalHost(authHost));
const reason = !firestoreHost
  ? 'FIRESTORE_EMULATOR_HOST not set; skipping emulator integration tests'
  : !authHost
    ? 'FIREBASE_AUTH_EMULATOR_HOST not set; skipping Auth-dependent integration tests'
    : !available
      ? 'Both emulator hosts must point to localhost/127.0.0.1; refusing external services'
      : '';
const projectId = 'demo-resell-backend';
const randomId = () => crypto.randomUUID().replaceAll('-', '');

async function setupEmulator() {
  assert.ok(available, reason);
  const { getApps, initializeApp } = require('firebase-admin/app');
  if (!getApps().length) initializeApp({ projectId });
  const { getFirestore } = require('firebase-admin/firestore');
  const { getAuth } = require('firebase-admin/auth');
  const db = getFirestore();
  const auth = getAuth();
  // The production config loads dotenv; integration tests must never read .env.
  const Module = require('node:module');
  const originalLoad = Module._load;
  let app;
  try {
    Module._load = function (request, parent, isMain) {
      if (request === 'dotenv') return { config: () => ({ parsed: {} }) };
      return originalLoad.call(this, request, parent, isMain);
    };
    app = require('../../index');
  } finally {
    Module._load = originalLoad;
  }
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const baseUrl = `http://127.0.0.1:${server.address().port}`;
  const references = [];
  const authUids = [];
  const nonce = randomId().slice(0, 12);
  let counter = 0;
  const docId = (prefix = 'fixture') => `${prefix}_${nonce}_${++counter}`;
  const track = ref => { references.push(ref); return ref; };

  async function account(label, options = {}) {
    const uid = docId('uid');
    const email = `${uid}@example.test`;
    const password = 'EmulatorOnly42Password!';
    await auth.createUser({ uid, email, password, emailVerified: true, displayName: label });
    authUids.push(uid);
    if (options.admin) await auth.setCustomUserClaims(uid, { resellAdmin: true });
    if (options.profile !== false) {
      await track(db.collection('users').doc(uid)).set({
        uid, email, name: label, verified: false, suspended: Boolean(options.suspended),
      });
    }
    const login = await fetch(
      `http://${authHost}/identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=fake-api-key`,
      { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true }) },
    );
    const data = await login.json();
    assert.equal(login.status, 200, `Auth emulator login failed: ${JSON.stringify(data)}`);
    return { uid, email, token: data.idToken };
  }

  async function request(method, path, options = {}) {
    const headers = {};
    if (options.token) headers.authorization = `Bearer ${options.token}`;
    if (options.body !== undefined) headers['Content-Type'] = 'application/json';
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers,
      body: options.body === undefined ? undefined : typeof options.body === 'string'
        ? options.body : JSON.stringify(options.body),
    });
    const text = await response.text();
    let body;
    try { body = JSON.parse(text); } catch { body = text; }
    return { status: response.status, body };
  }

  async function car(owner, changes = {}) {
    const ref = track(db.collection('sell').doc(docId('car')));
    await ref.set({
      sellerUid: owner.uid,
      email: owner.email,
      sellername: 'Test owner',
      category: 'toyota', model: 'Avensis', price: '4000',
      approvalStatus: 'approved',
      booked: false, sold: false, demo: false, hidden: false,
      paused: false, sellerUnavailable: false, ...changes,
    });
    return ref;
  }

  async function book(carRef, buyer) {
    const response = await request('POST', `/bookings/${carRef.id}`, { token: buyer.token });
    if (response.status === 201) {
      track(db.collection('orders').doc(response.body.order._id));
    }
    return response;
  }

  async function close() {
    await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    for (const ref of references.reverse()) {
      await ref.delete().catch(() => {});
    }
    for (const uid of authUids.reverse()) {
      await auth.deleteUser(uid).catch(() => {});
    }
  }
  return { db, auth, request, account, car, book, track, docId, close };
}
module.exports = { available, reason, setupEmulator };
