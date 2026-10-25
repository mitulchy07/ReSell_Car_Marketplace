# ReSell Marketplace API

This is a CommonJS Express API backed by Firebase Authentication and Cloud Firestore. It supports public vehicle browsing, one-reservation-per-car booking, authenticated listing management for **any signed-in member**, reporting, and administrator moderation. Owner-based authorization relies on Firebase UID, not legacy buyer/seller account roles. Listing `sellerType` describes the listing, not the account.

## Prerequisites and startup

- Node.js with the existing project dependencies installed. **Do not change** the pinned `firebase-admin@13.10.0` dependency for this documentation step.
- Firestore access via the existing Firebase Admin initialization. Never commit credential files or expose admin credentials to the React frontend.
- Start with `npm start` from the backend root. `PORT` controls the listening port.
- `npm test` runs all test files; emulator-dependent integration tests are **skipped** unless both emulator hosts are configured.
- `npm run routes` prints the registered route table.
- `GET /health` is a process health endpoint; it does not perform a Firestore connectivity probe.

## Configuration — environment variable names only

- `PORT`
- `FIREBASE_SERVICE_ACCOUNT_JSON` **or** `GOOGLE_APPLICATION_CREDENTIALS` (as supported by the existing initializer)
- `ADMIN_UIDS`, `ADMIN_EMAILS` (bootstrap admin allowlists)
- `GOOGLE_CLOUD_PROJECT`, `GCLOUD_PROJECT` (optional project selection for emulator tests)
- `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST` (emulator testing only)

## API routes

`Public` means no bearer token is required. `Member` requires a valid Firebase ID token and a non-suspended account. For member-owned resources, UID ownership and current reservation/listing state are verified server-side. `Admin` additionally requires bootstrap-allowlist or live custom-claim admin access.

| Method | Path | Access |
|---|---|---|
| GET | `/` | Public |
| GET | `/health` | Public |
| GET | `/categories` | Public |
| GET | `/category/:category` | Public |
| GET | `/advertised` | Public |
| GET | `/listings` | Public; returns a **plain array** |
| GET | `/listings/page` | Public |
| GET | `/listings/:id` | Public |
| POST | `/bookings/:carId` | Member; must not own vehicle |
| GET | `/myorders/:email` | Member; matching email and UID |
| POST | `/bookings/:orderId/cancel` | Member; reservation buyer only |
| POST | `/users` | Member; profile upsert |
| POST | `/sell` | Member; new listings require moderation |
| GET | `/myitems/:email` | Member; matching email and UID |
| DELETE | `/myitems/:id` | Member; listing owner only |
| PATCH | `/myitems/:id` | Member; listing owner only |
| PATCH | `/myitems/:id/availability` | Member; listing owner only |
| GET | `/seller/orders` | Member; orders for owned listings |
| PATCH | `/seller/orders/:orderId` | Member; order seller only |
| POST | `/reports/:id` | Member |
| GET | `/admin/me` | Admin |
| GET | `/admin/listings` | Admin |
| GET | `/admin/orders` | Admin |
| GET | `/admin/overview` | Admin |
| PATCH | `/admin/listings/:id` | Admin |
| PATCH | `/admin/listings/:id/review` | Admin |
| PATCH | `/admin/orders/:orderId` | Admin |
| GET | `/admin/users` | Admin |
| PATCH | `/admin/users/:id` | Admin |
| GET | `/admin/users/directory` | Admin |
| PATCH | `/admin/users/:id/admin` | Admin |
| DELETE | `/admin/users/:id` | Admin |
| GET | `/admin/reports` | Admin |
| PATCH | `/admin/reports/:id` | Admin |
| GET | `/admin/audit` | Admin |

## Testing

From the backend directory, syntax-check all JavaScript and run the built-in tests without adding dependencies:

```bash
find . -path './node_modules' -prune -o -name '*.js' -print0 | xargs -0 -n1 node --check
node --test tests/*.test.js
node scripts/route-table.js
```

Without running emulators, the integration tests skip and report why. Run Firestore and Auth emulators in a **separate terminal** with the test configuration and an isolated `demo-` project ID, then run the tests in another terminal with `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`, and the matching project ID. The emulator config intentionally uses permissive Firestore rules; backend authorization is tested at the Express layer, not via client security rules.

Do not test destructive admin actions or seeded integration fixtures against production Firestore or Firebase Auth.

## Compatibility and known limits

- Routes are mounted in a fixed order; keep `/listings/page` ahead of `/listings/:id`.
- Existing frontend endpoints, statuses and JSON response shapes are preserved by the readability-only Step 5 pass.
- Public `GET /listings` still reads all documents and returns an array; migrate frontend callers to `/listings/page` before changing that contract.
- Seller suspension with very large inventories needs retry handling after partial batch failure.
- The final production/security audit remains a separate release gate.

## Release checklist

- Confirm the production deployment uses Node.js 24 and both Firebase credentials and admin allowlist are configured.
- Run the full integration suite with isolated Firebase Auth and Firestore emulators; skipped tests are not passing tests.
- Check production authentication, admin authorization, listing quota, and reservation concurrency with non-destructive test data.
- Validate frontend CORS origins. `CORS_ORIGINS` is currently a hard-coded allowlist in `config.js`.
- Ensure `.env` and service-account credentials are never included in source control or deploy artifacts.
- Public `/listings`, `/category/:category`, and `/advertised` perform unbounded reads; consider migration to paginated queries.
- For large seller inventories, account suspension synchronization can partially fail and needs retry/reconciliation.
