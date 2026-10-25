# ReSell Market

A vehicle marketplace where people can browse cars, publish listings, reserve vehicles, and manage their activity in one account. Administrators can moderate listings, users, and reports.

**Live site:** https://resellmarket-fr.web.app  
**API:** https://resell-firestore-preview.vercel.app

## Features

- Search and browse cars by brand, with vehicle details and featured listings.
- Register and sign in using Firebase Authentication, including Google sign-in.
- Create, edit, pause, and delete your own vehicle listings.
- Reserve available vehicles, see your reservations, and cancel them.
- Manage incoming reservations for your own listings.
- Report listings; administrators can review reports, moderate vehicles, and manage accounts.
- Responsive interface for mobile and desktop.

## Tech stack

| Frontend | Backend & hosting |
| --- | --- |
| React 18, React Router, React Query | Node.js, Express |
| JavaScript, Tailwind CSS, daisyUI | Cloud Firestore, Firebase Admin SDK |
| React Hook Form, Firebase Authentication | Vercel API hosting, Firebase Hosting |

## Run locally

Requires Node.js and npm, a Firebase project, and access to a Firestore database.

### 1. Backend

```bash
cd backend
npm ci
```

Create `backend/.env` with one Firebase Admin credential option: `FIREBASE_SERVICE_ACCOUNT_JSON` **or** `GOOGLE_APPLICATION_CREDENTIALS`. Optional settings include `PORT`, `ADMIN_UIDS`, and `ADMIN_EMAILS`. Add your frontend origin to the `CORS_ORIGINS` list in `backend/config.js` when necessary.

```bash
npm start
```

The API uses port **4000** by default. Check `http://localhost:4000/health`.

### 2. Frontend

```bash
cd frontend
npm ci
```

Create `frontend/.env` with these variables from your Firebase web app:

```dotenv
REACT_APP_FIREBASE_API_KEY=
REACT_APP_FIREBASE_AUTH_DOMAIN=
REACT_APP_FIREBASE_PROJECT_ID=
REACT_APP_FIREBASE_STORAGE_BUCKET=
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=
REACT_APP_FIREBASE_APP_ID=
REACT_APP_API_URL=http://localhost:4000
```

`REACT_APP_IMGBB_API_KEY` is needed for image uploads if that feature is used. Firebase web configuration values are public client configuration; **never put Firebase Admin credentials in the frontend**.

```bash
npm start
```

Open `http://localhost:3000`. If using Google sign-in, authorize your development or deployed domain in Firebase Authentication settings.

## Test and build

```bash
cd backend && npm test
cd ../frontend && npm run build
```

Backend integration tests that require Firebase emulators are skipped unless the emulator hosts are configured. The frontend's production build is generated in `frontend/build/`.

## Deployment and security

The frontend is hosted on **Firebase Hosting** and the Express API on **Vercel**. Configure the correct API URL, Firebase Authentication authorized domains, backend CORS origins, and server-side Admin credentials for each environment. Never commit `.env` files, service-account keys, `node_modules`, or debug logs.
