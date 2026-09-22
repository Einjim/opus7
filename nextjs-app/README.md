# Konkoor Quiz App — Next.js port

This is a Next.js (App Router) port of the original Flask application.
The **backend is fully rewritten** in JavaScript (every route, same URLs,
same request/response shapes, same Postgres database). The **frontend is
untouched** — every original `.js`/`.html` file is copied byte-for-byte
into `public/` and still runs exactly as it did before; none of it was
rewritten in React.

## Setup

```bash
npm install
cp .env.example .env   # then fill in the values -- see below
npm run db:seed        # creates tables + loads quiz_questions.json (safe to re-run)
npm run dev
```

`.env.example` explains each variable. Three of the four are values you
already have from the original app's `.env` (`DATABASE_URL`,
`GEMINI_API_KEY`, `FLASK_SECRET_KEY` — reuse them as-is). The fourth,
`BLOB_READ_WRITE_TOKEN`, is new — see "Uploads" below for why.

## Deploying

Push this to GitHub and import it into Vercel — it's a standard Next.js
project, so Vercel builds and deploys it with zero configuration. Add the
same four environment variables in the Vercel project's settings
(Storage tab -> create a Blob store -> `BLOB_READ_WRITE_TOKEN` is added
for you automatically). Run `npm run db:seed` once locally (pointed at
your production `DATABASE_URL`) before or after the first deploy.

## What changed, and why

Everything below is a deliberate, documented adaptation to running on
Vercel's serverless platform rather than a persistent Flask/gunicorn
server — not a rewrite of the app's actual behavior. Business logic,
scoring, streak rules, coin costs, and every response shape were ported
field-for-field from `app.py`.

- **Uploads (profile pictures, teacherboard videos).** The original saved
  these to local disk. Vercel's servers don't have a persistent,
  writable filesystem, so uploads now go to Vercel Blob instead. Every
  *pre-existing* profile picture and video from your database/zip was
  copied into `public/` and still works at its original URL; only
  uploads made *after* you switch to this version use Blob storage.
  This is genuinely the one place where stored data isn't 100% the same
  shape as before (see the comments in `app/quiz/upload_video/route.js`
  for exactly how `video_url` values from new uploads differ from old
  ones, and how that's kept invisible to the untouched frontend code).

- **Sessions.** Flask signs its session cookie with a different scheme
  than anything available in Node, so this uses `iron-session` instead
  (see `lib/session.js`). It reuses your existing `FLASK_SECRET_KEY`, so
  no new secret is needed — but the cookie *format* itself is different,
  so everyone will need to sign in again once after you switch over.
  Nothing about their account, history, coins, etc. is affected, since
  all of that lives in Postgres and none of it touches the session
  format.

- **AI chat history.** Still the original's own in-memory-only design
  (their comment even says so: "lost on restart, not shared across
  worker processes"). That limitation is unchanged here — it's just more
  frequently visible on serverless, where instances cycle more often
  than a long-lived process. Moving it into Postgres would be a natural
  follow-up, but it's a behavior change, so it wasn't done here.

- **`islands` / `questions` tables (gamification map).** The original
  never seeded any rows into these anywhere in `app.py` either — same
  here. The seed script creates both tables and leaves them empty,
  matching the original's actual behavior (not a gap introduced by this
  port).

Everything else — auth, quizzes, multiplayer rooms, voting, comments,
leaderboard, messaging, streaks, HP/gems, the AI chat endpoint itself,
progress/remedial tests, quiz history — is a direct logic port with no
behavior changes. Route-by-route notes on anything non-obvious are in
comments at the top of each file under `app/`.

## Project layout

```
app/                    Next.js routes. Structure mirrors the original
                         Flask URL paths as closely as the framework
                         allows (e.g. app/quiz/get_profile/route.js
                         handles POST /quiz/get_profile).
lib/                     Shared helpers: DB pool, sessions, Gemini
                         client, AI chat history, voting, misc utilities.
html-pages/              The 3 original Jinja templates (signup, signin,
                         create-account), resolved to static HTML.
public/quiz/, public/static/
                         Every original frontend file, unchanged --
                         mirrors both original URL namespaces
                         (Flask's /static/... and the app's /quiz/...).
middleware.js            Reproduces the auth-gate + trailing-slash
                         behavior of the original's `/quiz/` route.
scripts/seed-db.js       One-time DB setup (see "Setup" above).
```

## A known limitation carried over from the original

`app.py`'s own comments already flag a couple of things as
pre-existing, not-fully-solved issues (the AI chat history note above is
one). This port preserves those as-is rather than silently fixing them,
since fixing them would be a behavior change beyond what was asked for.
If you'd like any of them addressed (moving AI chat history to Postgres,
for instance), that's a reasonable follow-up but a deliberate one.
