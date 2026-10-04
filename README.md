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
- [Quick start](#quick-start)
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

## Quick start

**Requirements:** Node.js 18+ (20+ recommended) and a MongoDB instance running locally
(`mongodb://127.0.0.1:27017`) or a connection string you can supply.

```bash
# 1. install everything (root, plus both workspaces)
npm install

# 2. create the server environment file
cp server/.env.example server/.env      # Windows: copy server\.env.example server\.env

# 3. add demo users, offices and appointment slots
npm run seed

# 4. start the API (:5000) and the web app (:5173) together
npm run dev
```

Then open **http://localhost:5173**.

The sign-in page has a "Try it out" panel — click any role to fill the form for you.

> The server refuses to start in `production` mode unless `JWT_SECRET` (32+ characters) and
> `MONGO_URI` are set, so demo defaults can never leak into a real deployment.

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
| `npm start` | run the API (set `NODE_ENV=production` for a real deployment) |
| `npm test` | full test suite |
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
