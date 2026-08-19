
# Email Scheduler — Outbox Labs SDE Assignment

A production-style email scheduling service and dashboard, built for the ReachInbox hiring assignment. Backend uses BullMQ delayed jobs (no cron) backed by Redis for persistent, restart-safe scheduling, with MySQL for durable records. Frontend is a Next.js dashboard with real Google OAuth.

## Tech Stack

**Backend:** Express.js, TypeScript, MySQL (via `mysql2`), BullMQ + Redis, Nodemailer (Ethereal SMTP)

**Frontend:** Next.js 16 (App Router), TypeScript, Tailwind CSS, NextAuth v5 (Google OAuth)

**Infra:** Docker Compose (Redis, MySQL, backend, worker, frontend)

## Quick Start (Docker — recommended)

Requires Docker Desktop installed and running.

1. Clone the repo and `cd` into it.

2. Copy `.env.example` to `.env` at the project root and fill in:

   - `ETHEREAL_USER` / `ETHEREAL_PASS` — get free test SMTP credentials at https://ethereal.email/create

   - `AUTH_SECRET` — generate with `npx auth secret` (or any random 32+ char string)

   - `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` — from Google Cloud Console (see "Google OAuth Setup" below)

3. Run:

```bash

   docker compose up --build

```

4. Open http://localhost:3000 — you'll be redirected to the login page.

5. Backend API is available at http://localhost:4000/api.

That's it — Redis, MySQL, the backend API, the background worker, and the frontend all start together with this one command.

## Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create a project.

2. **APIs & Services → OAuth consent screen** → set up as "External," add your own Google account as a **Test user** (required while the app is unpublished).

3. **APIs & Services → Credentials → Create Credentials → OAuth client ID** → Web application.

4. Add this **Authorized redirect URI** exactly:http://localhost:3000/api/auth/callback/google


5. Copy the Client ID and Client Secret into `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` in your `.env`.

**Note:** NextAuth v5 (beta, used here since it supports the Next.js App Router) expects `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` as the env var names specifically — not the older `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` convention seen in most v4 tutorials.

## Manual Setup (without Docker)

**Backend:**
```bash
cd backend
npm install
# create backend/.env with DB/Redis/Ethereal credentials (see .env.example)
npm run dev      # starts the API server on :4000
npm run worker   # in a second terminal — starts the background worker
```

**Frontend:**
```bash
cd frontend
npm install
# create frontend/.env.local with AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET
npm run dev      # starts on :3000
```

Also requires Redis and MySQL running locally or via `docker compose up redis mysql` for just those two services.

## Architecture Overview

### How scheduling works
When a campaign is created (`POST /api/campaigns`), the backend:
1. Writes the campaign and one row per recipient to MySQL (`status: SCHEDULED`).
2. Adds one BullMQ **delayed job** per email to a Redis-backed queue, with `delay` computed as `scheduledAt - now`.
3. A separate worker process watches this queue continuously. When a job's delay expires, BullMQ hands it to the worker, which sends the email via Ethereal SMTP and updates the row to `SENT` (or `FAILED` after retries are exhausted).

No cron jobs are used anywhere — all scheduling is BullMQ delayed jobs backed by Redis.

### How persistence on restart is handled
Job data lives in Redis, not in the Node process's memory. If the worker (or the whole server) restarts, BullMQ reads existing delayed jobs back from Redis on startup and continues honoring their original scheduled times — nothing is lost, re-sent, or restarted from scratch. This was tested manually: a job was scheduled, the worker process was killed entirely, confirmed still present in Redis via `redis-cli KEYS`, then the worker was restarted and the job fired automatically at its original scheduled time with zero manual intervention.

### How rate limiting & concurrency are implemented
- **Concurrency:** the BullMQ worker is configured with `concurrency: WORKER_CONCURRENCY` (env-configurable, default 5), controlling how many jobs it processes in parallel.
- **Minimum delay between sends:** after each successful send, the worker pauses `MIN_DELAY_BETWEEN_EMAILS_MS` (env-configurable, default 2000ms) before picking up its next job.
- **Hourly limit:** enforced via a Redis counter keyed by `sender + current hour window` (e.g. `rate-limit:sender@x.com:2026-8-19-14`), incremented atomically with `INCR` and set to auto-expire after 3600 seconds. This makes the counter safe across multiple worker instances (Redis atomicity prevents race conditions) and self-resetting every hour with no manual cleanup needed.
- When a job would exceed the hourly limit, it is **not dropped or failed** — it's re-added to the queue with a new delay pushing it into the next hour window, and the corresponding database row's `scheduled_at` is updated to stay accurate. This was tested manually by setting `hourlyLimit: 1` with 2 recipients: the first sent immediately, the second was correctly deferred with a log confirming the reschedule.
- **Idempotency:** each email's BullMQ job ID is deterministically derived as `email-{campaignId}-{emailId}`. Since BullMQ rejects duplicate job IDs, the same email can never be queued twice, even under retry or accidental duplicate API calls.
- **Retries:** each job is configured with `attempts: 3` and exponential backoff (`5000ms` base delay). Only after all 3 attempts fail is the row marked `FAILED` with the captured error message.

### Behavior under load (1000+ emails)
Scheduling 1000+ emails for the same time creates 1000+ individual delayed jobs in Redis, each carrying its own idempotent ID. As they become due, the worker's `concurrency` setting bounds how many are processed in parallel; the per-sender hourly Redis counter caps how many actually send within each hour window, deferring the rest forward in FIFO-ish order (jobs are re-queued with their original relative order preserved as much as BullMQ's scheduling allows). This was not load-tested with 1000 real sends (impractical against Ethereal within the assignment window), but the underlying mechanism — atomic Redis counters plus requeue-on-limit — was verified correct at small scale and does not change in principle at higher volume.

## Features Implemented

**Backend:**
- [x] Email scheduling via REST API, stored in MySQL
- [x] BullMQ delayed-job scheduling (no cron)
- [x] Restart persistence (verified live)
- [x] Configurable worker concurrency
- [x] Configurable minimum delay between sends
- [x] Configurable per-sender hourly rate limit with Redis-backed atomic counters
- [x] Rate-limited jobs rescheduled into next hour window (not dropped)
- [x] Idempotent job IDs (no duplicate sends)
- [x] Retry with exponential backoff (3 attempts) + FAILED status with error message on exhaustion
- [x] Ethereal SMTP integration with preview URL capture
- [x] `GET /api/emails?status=` (list, filterable)
- [x] `GET /api/emails/:id` (single email detail)

**Frontend:**
- [x] Real Google OAuth login (NextAuth v5), session-protected dashboard routes
- [x] Dashboard shell with sidebar (real user name/email/avatar, logout)
- [x] Scheduled and Sent inbox-style list views with live data
- [x] Email detail view with sender/recipient/timestamp/body and "View Rendered Email" link (Ethereal preview)
- [x] Compose page: recipient chips, CSV/TXT bulk upload with detected-count display, subject, body, delay/hourly-limit fields, schedule picker
- [x] Loading and empty states on list views
- [x] Failed-status styling (red badge) wired to backend error data

## Assumptions, Shortcuts & Trade-offs

- The frontend runs via `npm run dev` inside its Docker container rather than a production build (`next build && next start`), given the assignment's time window — functionally complete but not production-optimized.
- CSV parsing is done client-side (regex-matching email addresses from the uploaded file's text) rather than via a dedicated backend endpoint — simpler and equally valid for the stated requirement (detecting and displaying recipient count).
- The rate-limit reschedule pushes jobs forward by a flat 1 hour rather than calculating the exact remaining seconds to the top of the next clock hour — functionally correct (satisfies "delayed into the next available hour window") but not minimal-latency.
- Email/password fields on the login screen are present (matching the Figma) but intentionally disabled/non-functional, since the assignment requires real Google OAuth specifically, not email/password auth.
- Sender selection is currently fixed to a single sender email in the Compose form rather than a full multi-sender picker UI, though the backend schema and rate-limiting logic fully support multiple senders.
- 1000+ email load behavior is reasoned about and implemented per the mechanism described above, but not literally load-tested at that volume against the Ethereal sandbox within the assignment window.

## Demo Video

See [link] — covers: scheduling from the dashboard, the Scheduled/Sent views, a live restart-persistence demonstration (stop worker → confirm job survives in Redis → restart → auto-fires), and rate-limiting behavior under a low hourly cap.
