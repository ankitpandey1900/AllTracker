<div align="center">
  <img src="./public/pwa-logo.png" width="260" height="260" style="border-radius: 30px; box-shadow: 0 14px 40px rgba(0, 0, 0, 0.25);" alt="All Tracker Logo">
  <h1> AllTracker </h1>
  <p><strong>The High-Performance Mission Control for the Grind.</strong></p>

  <p>
    <a href="https://alltracker.online"><strong>Launch Live Tracker</strong></a> |
    <a href="https://github.com/ankitpandey1900/Tracker/issues">Open an Issue</a>
  </p>
</div>

AllTracker is the study and focus tracker I built for myself. I wanted one place for daily tasks, study sessions, routines, a long-term tracker, and progress that does not disappear when I switch from my phone to my laptop.


## What it does

- Tracks study time with a focus timer and session history.
- Keeps daily and weekly tasks, routines, bookmarks, and a timeline tracker.
- Lets me define study phases with their own subjects/columns.
- Shows analytics, streaks, profile stats, badges, and a public leaderboard.
- Has a social feed for posts and comments.
- Includes Maamu AI for study feedback. The app uses Gemini through the server environment for that part.
- Works as a PWA, so it is usable on mobile as well as desktop.

## How the app is built

I intentionally kept the frontend framework-free. The UI is Vanilla TypeScript with Vite and custom CSS. The API runs as Vercel serverless functions, Better Auth handles Google/GitHub sign-in, and Supabase Postgres stores user data.

```text
Browser (TypeScript + Vite)
        |
        | local cache first, then authenticated API requests
        v
Vercel API + Better Auth
        |
        v
Supabase Postgres
```

The browser cache is there for speed and offline resilience. The database is the shared source of truth after sign-in. Tasks and phases are synced record by record; deleting one requires an explicit delete action, rather than treating a missing item from one device as a deletion.

## Main folders

```text
src/
  core/          app startup, refresh cycle, global events
  features/      timer, tasks, tracker, feed, routines, dashboard, settings, etc.
  services/      API client, authentication, cloud sync, local storage
  state/         application state
  styles/        global and feature styles

api/
  _routes/       API route handlers
  _lib/          auth, database, HTTP helpers, repositories
  auth/          Better Auth endpoint

docs/            database migrations and development notes
```

If I am working on saved user data, I start with these files:

- `src/services/data-bridge.ts`: local cache and sync decisions.
- `src/services/vault.service.ts`: frontend calls for saved data.
- `api/_routes/vault/[name].ts`: authenticated vault endpoints.
- `api/_lib/data/vault-repo.ts`: database reads/writes for tracker data.

## Run locally

Requirements: Node 24 and a Supabase Postgres database.

```bash
git clone https://github.com/ankitpandey1900/Tracker.git
cd AllTracker
npm install
```

Copy `.env.example` to `.env` and fill in the values:

```env
DATABASE_URL=
BETTER_AUTH_SECRET=
BETTER_AUTH_URL=http://localhost:5173
BETTER_AUTH_TRUSTED_ORIGINS=http://localhost:5173

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Then run:

```bash
npm run dev
```

Before pushing or deploying, I run:

```bash
npm run typecheck
npm run build
```

## Database changes

Schema changes are not automatic. Run the relevant SQL migration in the Supabase SQL editor before deploying code that depends on it. In particular, the record-level phase sync update needs:

```text
docs/phase-sync-migration.sql
```

Keep database migrations with the code change that needs them. It makes deployments much less confusing.

## Deployment

The app is deployed on Vercel. Add the same environment variables in Vercel, change `BETTER_AUTH_URL` and trusted origins to the production domain, run required Supabase migrations, then deploy.

## Notes for future me

- Do not make a whole browser snapshot delete records in the database. This is especially dangerous when a user signs in on a new device.
- For task, timer, feed, or phase issues, check the API response and database row first; the UI can only show what it receives.
- Keep local storage as a fast cache, not the long-term authority for signed-in users.

Built while trying to make the daily study grind a little more visible and a lot more consistent.
