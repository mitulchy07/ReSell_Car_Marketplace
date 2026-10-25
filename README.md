# 42 Horizon — Backend

Backend API for **42 Horizon**, a platform showcasing 42 students, their portfolios, projects, and learning journeys.

The backend currently focuses on retrieving permitted student information from the **42 Intranet API**. Portfolios, local database persistence, and other product modules are being developed separately.

## Requirements

- **Node.js** (LTS recommended, Node 20+ for built-in `fetch`)
- **npm**
- Access to the project's `.env` configuration, shared privately by the team on Discord

Check your installation:

```bash
node -v
npm -v
```

## Getting started

1. Clone the team's backend repository (replace the URL with the actual repository link):

   ```bash
   git clone <BACKEND_REPOSITORY_URL>
   cd <BACKEND_REPOSITORY_FOLDER>
   ```

   If this backend is in a monorepo, enter its `backend/` folder instead.

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Get the **`.env`** file from the designated private channel on our Discord server. Save it in the **backend root**, next to `package.json` (not in `src/`). Do **not** commit or repost it.

   Required settings for the 42 API integration:

   ```dotenv
   PORT=3000
   FRONTEND_URL=http://localhost:5173
   INTRA42_CLIENT_ID=<provided privately>
   INTRA42_CLIENT_SECRET=<provided privately>
   ```

   If the OAuth login feature is present in your branch, it also uses:

   ```dotenv
   INTRA42_REDIRECT_URI=http://localhost:3000/api/auth/42/callback
   SESSION_SECRET=<provided privately>
   ```

   **Never put real credentials in documentation, Git commits, screenshots, or public Discord channels.** If a secret has been exposed, notify the owner so it can be rotated.

4. Start the development server:

   ```bash
   npm run dev
   ```

   Default address: `http://localhost:3000`.

5. Test an endpoint in your browser, with `curl`, or with Postman:

   ```bash
   curl http://localhost:3000/api/health
   ```

   A working health endpoint returns JSON with a status such as `"ok"`.

## Project structure

The initial backend is deliberately small. Depending on the branch, you may also see OAuth and Swagger files.

```text
backend/
├── src/
│   ├── server.ts       # Express server and middleware
│   ├── routes.ts       # Student and health routes
│   ├── intra42.ts      # 42 API token and requests
│   ├── auth.ts         # 42 OAuth login (if implemented)
│   ├── session.d.ts    # Session types (if implemented)
│   └── swagger.ts      # Swagger UI (if implemented)
├── .env                # Private configuration; never commit
├── .gitignore
├── package.json
└── tsconfig.json
```

## API endpoints

Base URL for local development: `http://localhost:3000`.

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Check that the API is responding |
| GET | `/api/students/:login` | Retrieve a student's selected 42 profile fields |
| GET | `/api/students/:login/projects` | Retrieve available student project attempts and scores |

For example:

```bash
curl http://localhost:3000/api/students/mshariar
curl http://localhost:3000/api/students/mshariar/projects
```

The profile endpoint can include `id`, `login`, `name`, `image`, `campus`, `status`, `level`, `skills`, and `cursus`, depending on the route's current response mapper and upstream availability.

**Profile image:** The `image` value is a URL. For example, retrieve the profile JSON and use `student.image` as the `src` in a frontend `<img>` element. A separate image endpoint is not required.

### OAuth endpoints (only if `src/auth.ts` is implemented and mounted)

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/42` | Begin browser-based 42 login |
| GET | `/api/auth/42/callback` | Handle the 42 OAuth callback |
| GET | `/api/auth/me` | Get the signed-in user; `401` if unauthenticated |
| POST | `/api/auth/logout` | End the current session |

OAuth uses browser redirects and cookies. Start the flow from `/api/auth/42` in a browser; do not confuse it with the server-to-server credentials used to read public 42 data.

### Interactive API documentation (only if Swagger is configured)

- Local: `http://localhost:3000/apidocumentation`
- Intended production URL: `https://42horizon.fr/apidocumentation`

The production URL only works after the deployment teammate configures HTTPS and reverse-proxy routing. Swagger lists **documented** endpoints; it does not automatically discover every Express route.

## Using Postman

1. Create a collection called **42 Horizon API**.
2. Set a collection/environment variable named `base_url` to `http://localhost:3000`.
3. Add requests such as `GET {{base_url}}/api/health` and `GET {{base_url}}/api/students/mshariar`.
4. Click **Send** and inspect the status code and JSON response.

For session-protected requests, authenticate first and retain the relevant session cookie. Postman success does not necessarily prove browser CORS settings are correct.

## Useful commands

```bash
npm run dev     # Start development server
npm run check   # Type-check without emitting files, if configured
npm run build   # Compile TypeScript, if configured
npm start       # Run compiled server, if configured
```

If `npm run check` reports `Missing script: "check"`, add the script to `package.json`:

```bash
npm pkg set 'scripts.check=tsc --noEmit'
```

Run `npm run` to view the scripts actually available in your checkout.

## Troubleshooting

- **`npm: command not found`** — Install Node.js LTS, reopen the terminal, and confirm with `node -v` and `npm -v`.
- **`Missing 42 API credentials`** — Confirm `.env` is at the backend root and contains both 42 credentials; restart the server.
- **Port 3000 already in use** — Stop the other process or change `PORT` in `.env`.
- **42 API returns 401/403** — Check the app credentials and granted scope. Do not paste secrets into support messages.
- **OAuth redirect fails** — Confirm `INTRA42_REDIRECT_URI` matches a redirect URI registered in the 42 application exactly.
- **Frontend CORS error** — Confirm `FRONTEND_URL` matches the frontend's actual origin, including its port.
- **Endpoint returns 404** — Check the route exists in the current branch and its router is mounted in `server.ts`.

## Team responsibilities and security

The backend team handles API integration, authentication, routes, and application data logic. A separate teammate handles Docker, CI/CD, and deployment. Coordinate configuration and ports with that teammate, but local backend development does not require Docker.

Only retrieve and expose 42 data necessary for the application. **Do not publish private contact fields or imported profiles automatically.** The server's 42 API client credentials are not student login credentials. Before deploying, replace development-only session storage and cookie settings with production-safe equivalents and restrict interactive API documentation where appropriate.

## Current status

- [x] Express REST API foundation
- [x] 42 client-credentials integration for student profile lookup
- [x] Student profile route
- [x] Student project-history route (verify in your checkout)
- [ ] Confirm browser OAuth login works end-to-end
- [ ] Database and portfolio persistence
- [ ] Team/project showcase and publication workflows
- [ ] Production deployment and protections

Update this checklist as features are merged. **A documented route is not proof it has been implemented or tested in every branch.**
