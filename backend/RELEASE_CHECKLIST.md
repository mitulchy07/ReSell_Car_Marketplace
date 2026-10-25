# Release checklist — reservation limit

## Change
- Each Firebase buyer UID has a transactional reservation ledger under `buyerReservationLimits/{uid}`.
- At most three active `pending`, `booked`, or `confirmed` orders can exist per buyer.
- The first new booking initializes a buyer's ledger from existing orders.
- Buyer cancellation, seller decline/completion, and admin cancel/completion release the reservation slot transactionally.
- Rejected fourth bookings return HTTP 429. The limit applies per account, not per human.

## Important pre-deployment checks
1. Run `npm ci`, `npm run check:syntax`, and `npm audit --omit=dev` using Node 24.
2. Run full emulator tests using `npx firebase emulators:exec --only auth,firestore --project demo-resell-backend --config tests/emulator.config.json "npm test"`.
3. Verify the two new `emulator-reservation-limit.test.js` tests pass with no skips/failures.
4. Check the first-booking bootstrap with existing Firestore orders and monitor transaction contention (the ledger serializes reservations per buyer).
5. Configure rate limiting on the **Vercel project** or another shared datastore for POST booking, cancellation, reports, and other write routes. No rate limiting was provisioned by this ZIP. Suggested initial policies should be load-tested against real traffic and adjusted to avoid disrupting legitimate buyers.
6. Verify production Firestore security rules: the emulator config does not load rules and uses open emulator rules. Direct client writes to `orders`, `sell` and `buyerReservationLimits` must not bypass API business logic.
7. Test staging/preview before production and retain a rollback deployment.

## Remaining risks
- This cap does not prevent someone creating multiple accounts, rapidly cancelling/rebooking, or spamming other endpoints. Consider verified email, anti-automation controls, and server-side rate limiting.
- Historical orders missing `buyerUid` cannot be attributed to the buyer during bootstrap.
- Admin/manual changes made directly in Firestore can cause ledger drift. Changes to booking order status should go through the API.
- Booking/order records and ledgers may require operational repair tooling if manually modified.
- Firebase project config in tests must match `demo-resell-backend`.
- Source syntax verified here; full npm/emulator tests **not run** in this environment because node_modules was unavailable offline. Must pass on the user's local machine.
