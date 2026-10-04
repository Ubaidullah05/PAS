# Passport Automation System

A full-stack **Passport Seva** portal built with the MERN stack, where citizens apply for a
passport online and government staff verify, approve and issue it — with strict role based
access control enforced on the server.

Everything a citizen reads is written in plain, everyday English. No legal jargon, no
department-speak.

---

## Table of contents

- [What it does](#what-it-does)
- [Tech stack](#tech-stack)
- [How to run it](#how-to-run-it)
- [Demo accounts](#demo-accounts)
- [The passport journey](#the-passport-journey)
- [Roles and permissions](#roles-and-permissions)
- [Project layout](#project-layout)
- [API reference](#api-reference)
- [Security notes](#security-notes)
- [Testing](#testing)
- [Available scripts](#available-scripts)
- [Environment variables](#environment-variables)
- [Troubleshooting](#troubleshooting)

---

## What it does

**For citizens (applicant)**

- Create an account, start a passport application and save it as a draft.
- Fill personal, contact and family details in plain language, with the form refusing to be
  sent until everything required is present.
- Upload supporting papers (JPG, PNG, WEBP or PDF) and see them listed with their review state.
- Watch a six-step progress tracker and a full status history.
- Book, reschedule or cancel a visit at any passport office.
- Receive in-app notifications the moment something changes.

**For staff**

- **Document verifier** — works the verification queue, reviews uploaded papers, approves or
  sends applications back with a reason.
- **Passport officer** — works the approval queue, approves applications and issues the
  passport (generating the reference and passport number).
- **Administrator** — full control room: overview metrics, people and roles, passport offices,
  appointment slots, reports and the audit trail.

**Cross-cutting**

- A strict, deny-by-default permission matrix on every API route.
- A state machine that makes skipping or repeating a step impossible.
- An audit trail of every sensitive action (who, what, when, from where).
- Seed data with four demo logins, four offices and two weeks of appointment slots.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| Front end | React 18, React Router 7, Vite 6, hand-written CSS (no UI framework) |
| Back end | Node.js, Express 4, Mongoose 8 |
| Database | MongoDB |
| Auth | JSON Web Tokens (`jsonwebtoken`), password hashing with `bcryptjs` |
| Security | `helmet`, `cors`, `express-rate-limit`, `express-validator`, `multer` uploads |
| Tests | Jest + Supertest + in-memory MongoDB (server), Vitest + Testing Library (client) |
| Dev tooling | npm workspaces, `concurrently`, ESLint 9 |

---

## How to run it

### 1. Check what you need

| Requirement | Version | How to check |
| --- | --- | --- |
| Node.js | 18 or newer (20+ recommended) | `node -v` |
| npm | 9 or newer (ships with Node) | `npm -v` |
| MongoDB | any recent release, running locally | see step 2 |

This project was built and tested on **Node 24** with **MongoDB** on `127.0.0.1:27017`.

### 2. Make sure MongoDB is running

The API stores everything in MongoDB, so it must be up before you start the app.

**Docker (works everywhere)**

```bash
docker run -d --name pas-mongo -p 27017:27017 mongo:7
```

**Windows** — install MongoDB Community, then start the service:

```powershell
Start-Service MongoDB          # check it with: Get-Service MongoDB
```

**macOS**

```bash
brew install mongodb-community && brew services start mongodb-community
```

**Ubuntu / Debian**

```bash
sudo systemctl start mongod
```

Any MongoDB Atlas or other hosted database works too — just put its connection string in
`MONGO_URI`.

To confirm it is up: `Get-Service MongoDB` (Windows) or `docker ps` (Docker) should show it
running, and the API will confirm for you on start-up with `Connected to MongoDB`.

### 3. Install, configure and seed

Run all three commands from the repository root:

```bash
npm install                                             # installs root + server + client
cp server/.env.example server/.env                      # Windows: copy server\.env.example server\.env
npm run seed                                            # 4 logins, 4 offices, 14 days of slots
```

The seed prints every account it creates, so you can sign in straight away. It is safe to run
again at any time.

### 4. Start the app

```bash
npm run dev
```

That single command runs both halves with coloured, prefixed output:

```
[server]
[server]   Database   : connected to pas
[server]
[server]   Passport Automation System API
[server]   Environment : development
[server]   Listening   : http://localhost:5000
[client]
[client]   VITE v6.4.3  ready in 309 ms
[client]   Local:   http://localhost:5173/
```

| Address | What it is |
| --- | --- |
| **http://localhost:5173** | the web app — **open this one** |
| http://localhost:5000/api/health | API health check (`{"success":true,...}`) |
| http://localhost:5173/api/health | same check through the dev proxy |

The Vite dev server proxies `/api` to port 5000, so the front end only ever talks to one
origin and no CORS setup is needed while developing.

### 5. Sign in

Go to http://localhost:5173 and click any role in the **"Try it out"** panel on the sign-in
page to fill the form for you, then press **Sign in**.

### 6. Run the server (API)

The API must be running for the web app to work — it handles sign-in, data and file uploads.

**From the repository root:**

```bash
npm run dev:server
```

**Or from inside the `server` folder:**

```bash
cd server
npm run dev        # nodemon - restarts on every file change (use npm start to run once)
```

Expected output (keep this terminal open):

```
[nodemon] starting `node src/index.js`

  Database   : connected to pas

  Passport Automation System API
  Environment : development
  Listening   : http://localhost:5000
```

Confirm it is healthy in a second terminal:

```bash
curl http://localhost:5000/api/health
# {"success":true,"message":"Passport Automation System is running","data":{"uptime":12.34}}
```

PowerShell users (`curl` is an alias there and prints a formatted object instead of JSON) —
use the real binary:

```powershell
curl.exe http://localhost:5000/api/health
# or
(Invoke-WebRequest http://localhost:5000/api/health).Content
```

**MUST BE RUNNING:** MongoDB on `127.0.0.1:27017`, otherwise the API exits with
`MongooseServerSelectionError` (see step 2).

If the API fails with `EADDRINUSE`, another process already owns port 5000 — either stop it or
change `PORT` in `server/.env`.

### 7. Run the client (web app)

**From the repository root** (in a second terminal, while the API is still running):

```bash
npm run dev:client
```

**Or from inside the `client` folder:**

```bash
cd client
npm run dev        # vite dev server with hot module replacement
```

Expected output (keep this terminal open too):

```
  VITE v6.4.3  ready in 309 ms

  Local:   http://localhost:5173/
```

Now open **http://localhost:5173** in your browser.

Notes:

- The client serves only the front end. Every call it makes goes to `/api`, which Vite proxies
  to `http://localhost:5000` (see `client/vite.config.js`), so the API must already be running.
- If the browser shows a network error on load, check the API terminal from step 6.
- Changes under `client/src/` appear instantly; no refresh or rebuild needed.

To stop either half, press `Ctrl + C` in its terminal — see step 10.

**Both halves together in one terminal:** if you prefer a single command, use `npm run dev`
(step 4), which starts the API and the client side by side with coloured prefixes (`[server]`
/ `[client]`).

### 8. Running the tests

```bash
npm test               # everything: server then client
npm run test:server    # 83 tests, 6 suites (uses an in-memory MongoDB)
npm run test:client    # 23 tests, 3 files
npm run lint           # ESLint over the client
```

The server tests spin up their own temporary database, so they never touch your real one and
you do not need MongoDB running to run the test suite.

### 9. Production-style run

```bash
npm run build          # builds the web app into client/dist
npm run preview        # serves that build on http://localhost:4173 to check it
npm start              # runs the API
```

Set `NODE_ENV=production` in `server/.env` first — that is the cross-platform way, and it also
lets the API verify its configuration. In production mode the API **refuses to start** unless
`JWT_SECRET` is at least 32 characters and `MONGO_URI` is set, so demo defaults can never reach
a real deployment.

The API does not serve the built front end. Host `client/dist` on any static host or CDN and
point its `/api` requests at the running API (set `CLIENT_URL` to that address so CORS
matches).

### 10. Stopping and restarting

Press `Ctrl + C` in the terminal running `npm run dev` — it stops both the API and the web
app. Start it again the same way whenever you need it; there is no background service to
clean up. `nodemon` restarts the API on its own whenever you edit a file under `server/`, and
the browser hot-reloads when you edit files under `client/src/`.

### 11. Walk through the whole journey

To see the full flow end to end, open two browser windows (or use a private window for the
staff side):

1. Sign in as the **applicant**, start an application, fill every section, upload a document
   and press send.
2. Sign in as the **verifier**, open *Documents to check*, review the paper, approve the
   documents.
3. Sign in as the **officer**, open *Applications to approve*, approve, then issue the
   passport — a passport number is generated automatically.
4. Back in the applicant window, the tracker and the status history update, and a
   notification explains what changed.
5. Sign in as the **administrator** to see the metrics, manage people and roles, offices and
   appointment slots, and read the audit trail of every action above.

---

## Demo accounts

Created by `npm run seed`. Passwords are intentionally simple because this is a demo.

| Role | Email | Password | Lands on |
| --- | --- | --- | --- |
| Applicant | `demo@pas.gov.in` | `Demo@1234` | `/dashboard` |
| Document verifier | `verifier@pas.gov.in` | `Verify@123` | `/console/verifications` |
| Passport officer | `officer@pas.gov.in` | `Officer@123` | `/console/approvals` |
| Administrator | `admin@pas.gov.in` | `Admin@1234` | `/admin` |

The seed is safe to re-run: users and offices are upserted, and duplicate slots are ignored.

---

## The passport journey

Every status change goes through one table (`server/src/utils/status.js`), so no one — not even
an admin using a raw API call — can skip a step or repeat one.

```
draft ──submit──▶ submitted ──startVerification──▶ verification_in_progress
   ▲                                                    │
   │                                        approveDocuments / sendBack / reject
   │                                                    ▼
   │       on_hold ◀── sendBack ──────── verified ◀──┘
   │            │
   │            └── resumeVerification / resumeApproval
   ▼
verified ──startApproval──▶ approval_in_progress ──approve──▶ approved ──issue──▶ issued
```

| Status | What the applicant sees |
| --- | --- |
| `draft` | Draft — not sent yet |
| `submitted` | Submitted — waiting for a verifier |
| `verification_in_progress` | Documents are being checked |
| `verified` | Documents approved — waiting for an officer |
| `approval_in_progress` | Officer is reviewing your application |
| `approved` | Approved — passport is being printed |
| `issued` | Passport issued — ready for delivery |
| `on_hold` | On hold — more information is needed |
| `rejected` | Rejected |

Actions are authorised against **the step they belong to**, not just the role. An officer
holding `application:reject` still cannot reject during document verification, because at that
point the rejection permission required is the verifier's.

---

## Roles and permissions

The matrix lives in `server/src/config/rbac.js` and is the single source of truth. The
front end mirrors it only to decide which buttons to show; the API always decides what is
actually allowed.

| Capability | Applicant | Verifier | Officer | Admin |
| --- | :---: | :---: | :---: | :---: |
| Create / edit / submit own application | ✅ | — | — | — |
| Upload and view own documents | ✅ | — | — | — |
| Book and manage own appointments | ✅ | — | — | — |
| View own dashboard | ✅ | — | — | — |
| Read any application | — | ✅ | ✅ | ✅ |
| Verify documents (queue) | — | ✅ | — | ✅ |
| Reject an application | — | ✅ (own stage) | ✅ (own stage) | ✅ |
| Approve and issue a passport | — | — | ✅ | ✅ |
| Manage appointment slots | — | — | — | ✅ |
| Manage users and roles | — | — | — | ✅ |
| Manage passport offices | — | — | — | ✅ |
| View reports | — | ✅ | ✅ | ✅ |
| View audit trail | — | — | — | ✅ |

Rules that keep it strict:

1. **Deny by default.** A route must name the exact permission it needs; unknown permissions
   are denied even for admins.
2. **Ownership is checked too.** Applicants can only ever reach their own records — enforced
   in the query, not in the UI.
3. **The client is not trusted.** Hiding a button is a courtesy; the API is the gate.

---

## Project layout

```
PAS/
├── package.json              # npm workspaces root, scripts for both apps
├── server/
│   ├── src/
│   │   ├── app.js            # express app: helmet, cors, rate limit, routes
│   │   ├── index.js          # server bootstrap
│   │   ├── config/           # env, database, RBAC matrix, constants
│   │   ├── controllers/      # request handling per feature area
│   │   ├── middleware/       # auth, permission rules, validation, errors
│   │   ├── models/           # mongoose models
│   │   ├── routes/           # URL → middleware → controller
│   │   └── utils/            # jwt, uploads, audit, notifications, status machine, seed
│   └── tests/                # jest + supertest suites
└── client/
    ├── src/
    │   ├── components/       # Shell (sidebar/topbar), badges, toasts, loader…
    │   ├── context/          # session, toasts, unread notifications
    │   ├── lib/              # api wrapper, labels/permissions, formatting
    │   ├── pages/            # public, applicant, staff and admin screens
    │   ├── styles/           # design system (tokens, components, responsive)
    │   └── test/setup.js
    └── vite.config.js        # dev server, /api proxy, vitest config
```

---

## API reference

All endpoints are prefixed with `/api`. Everything except registration, login, health and the
public office list requires `Authorization: Bearer <token>`.

**Auth**

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/auth/register` | public (always creates an applicant) |
| `POST` | `/auth/login` | public |
| `GET` | `/auth/me` | any signed-in user |
| `PUT` | `/auth/profile` | any signed-in user |
| `PUT` | `/auth/password` | any signed-in user (needs current password) |

**Applications**

| Method | Endpoint | Access |
| --- | --- | --- |
| `POST` | `/applications` | applicant — creates a draft |
| `GET` | `/applications/mine` | applicant — own applications |
| `GET` | `/applications/stats` | applicant — own counts |
| `GET` | `/applications/all` | staff — every application |
| `GET` | `/applications/queue?queue=verification\|approval` | staff — work queues |
| `GET` | `/applications/:id` | owner or staff |
| `PATCH` | `/applications/:id` | owner, drafts only |
| `DELETE` | `/applications/:id` | owner, drafts only |
| `POST` | `/applications/:id/submit` | owner |
| `POST` | `/applications/:id/move` | staff — `{ action, remark?, approval? }` |
| `POST` | `/applications/:id/documents` | owner (multipart upload) |
| `GET` | `/applications/:id/documents` | owner or staff |

**Documents**

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/documents` | signed in — documents the caller may see |
| `GET` | `/documents/:id/file` | owner or staff (streams the file) |
| `PATCH` | `/documents/:id/review` | staff — mark accepted / needs attention |
| `DELETE` | `/documents/:id` | owner or staff |

**Appointments and slots**

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/appointments/offices` | public |
| `GET` | `/appointments/slots?office=&date=` | signed in |
| `GET` | `/appointments/mine` | signed in |
| `POST` | `/appointments` | applicant — book a visit |
| `PATCH` | `/appointments/:id` | owner — reschedule or cancel |
| `GET` | `/appointments/slots/all` | admin |
| `POST` | `/appointments/slots` | admin — add a slot |
| `POST` | `/appointments/slots/range` | admin — add slots over a date range |
| `PATCH` | `/appointments/slots/:id/toggle` | admin — open or close a slot |

**Dashboard**

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/dashboard/overview` | applicant (own) or staff (all) |
| `GET` | `/dashboard/notifications` | signed in |
| `PATCH` | `/dashboard/notifications/:id` | signed in — use `all` to mark everything read |

**Administration**

| Method | Endpoint | Access |
| --- | --- | --- |
| `GET` | `/admin/users` | admin |
| `POST` | `/admin/users` | admin |
| `PATCH` | `/admin/users/:id` | admin — role and active state |
| `GET` | `/admin/roles` | admin |
| `POST` | `/admin/offices` | admin |
| `PATCH` | `/admin/offices/:id` | admin |
| `DELETE` | `/admin/offices/:id` | admin |
| `GET` | `/admin/reports?range=` | verifier, officer, admin |
| `GET` | `/admin/audit?limit=` | admin |

Offices are listed for everyone through the public `/appointments/offices` endpoint, so the
admin office manager reuses that list. The admin overview screen composes its numbers from
`/admin/reports`, `/admin/audit` and `/appointments/slots/all`.

`GET /api/health` is public and returns service status plus uptime — handy as a deployment
health check.

Every response uses the same envelope:

```json
{ "success": true, "message": "Human readable message", "data": { } }
```

Errors use `{ "success": false, "message": "...", "errors": ["..."] }` with a real HTTP status
code. Validation messages are written for citizens, not developers.

---

## Security notes

- Passwords hashed with bcrypt; plaintext passwords are never stored or logged.
- JWT expiry is configurable (1 day by default) and the secret must be set in production.
- `helmet` sets standard security headers; `cors` is restricted to `CLIENT_URL`.
- Rate limiting is applied to the API (600 requests / 15 minutes), with a tighter limit of 30
  attempts on sign-in and registration.
- Uploads are restricted by type and size (`MAX_UPLOAD_MB`, default 5 MB) and stored outside
  the web root in `uploads/`.
- Documents are never served as public files — they are streamed through an authorised route.
  The front end fetches them with the bearer token and opens a temporary blob URL.
- Every sensitive action writes an audit log entry with the actor, action, target and IP.
- The dev database is never trusted for authorisation decisions; the API re-checks ownership,
  role and permission on every request.

---

## Testing

```bash
npm test              # server (jest) then client (vitest)
npm run test:server   # 83 tests across 6 suites
npm run test:client   # 23 tests across 3 files
```

**Server** — Jest, Supertest and an in-memory MongoDB, so no real database is touched:

| Suite | Covers |
| --- | --- |
| `auth.test.js` | registration, login, duplicates, password change |
| `workflow.test.js` | the full journey, skipped steps, rejections, ownership, drafts |
| `rbac.test.js` | cross-role denials, stage-scoped actions, admin-only areas |
| `documents.test.js` | upload rules, review state, protected downloads |
| `appointments.test.js` | slot availability, booking, rescheduling, capacity |
| `admin.test.js` | users, roles, offices, slots, reports, audit trail |

**Client** — Vitest and Testing Library: public pages and the not-found screen, signed-out
redirects for protected and admin routes, label/milestone/permission helpers, and the
role-based sidebar.

---

## Available scripts

Run from the repository root.

| Script | What it does |
| --- | --- |
| `npm run dev` | API and web app together with coloured output |
| `npm run dev:server` | API only, with nodemon reload |
| `npm run dev:client` | web app only |
| `npm run seed` | demo users, four offices, 14 days of slots |
| `npm run build` | production build of the web app into `client/dist` |
| `npm run preview` | serve the built web app locally to check the build |
| `npm start` | run the API (set `NODE_ENV=production` for a real deployment) |
| `npm test` | full test suite |
| `npm run test:server` | server tests only (no database needed) |
| `npm run test:client` | client tests only |
| `npm run lint` | ESLint over the client |

---

## Environment variables

Create `server/.env`:

```ini
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/pas
JWT_SECRET=replace-with-a-long-random-string
JWT_EXPIRES_IN=1d
CLIENT_URL=http://localhost:5173
UPLOAD_DIR=uploads
MAX_UPLOAD_MB=5
```

| Variable | Default | Notes |
| --- | --- | --- |
| `PORT` | `5000` | API port |
| `MONGO_URI` | `mongodb://127.0.0.1:27017/pas` | required in production |
| `JWT_SECRET` | insecure demo value | required in production, 32+ characters |
| `JWT_EXPIRES_IN` | `1d` | token lifetime |
| `CLIENT_URL` | `http://localhost:5173` | CORS allow-list |
| `UPLOAD_DIR` | `uploads` | created on boot; git-ignored |
| `MAX_UPLOAD_MB` | `5` | per-file upload limit |

The API does not serve the built front end. For a deployment, build the client
(`npm run build`) and serve `client/dist` from any static host or CDN, with `/api` pointed at
the running API.

---

## Troubleshooting

**`MongooseServerSelectionError`** — MongoDB is not running or `MONGO_URI` is wrong. Start the
service, or point `MONGO_URI` at your own instance.

**`EADDRINUSE`** — something already owns port 5000 or 5173. Change `PORT`, or stop the other
process.

**Login says the account or password is wrong after seeding** — the seed only creates accounts
that do not exist yet; it never overwrites a password you changed. Re-create the account or
update it from the admin console.

**Uploads fail immediately** — check `UPLOAD_DIR` is writable. The API creates the folder on
boot if it can.

**Buttons missing in the UI** — expected. The sidebar only shows what the signed-in role may
use; every permission is enforced by the API regardless.

---

## License

Demonstration project — free to use for learning, teaching and portfolios.
