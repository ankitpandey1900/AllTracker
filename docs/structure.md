# Project map

```text
AllTracker/
  src/
    core/            startup, app refresh, command handling
    features/        product features: timer, tasks, tracker, feed, routines, settings
    services/        API client, auth, sync, storage, notifications
    state/           shared app state and derived tracker data
    styles/          global, component, and theme CSS
    types/           TypeScript models
  api/
    _routes/         server route handlers used by /api/app/*
    _lib/            database pool, auth, request helpers, repositories
    auth/            Better Auth route
  public/            PWA manifest, service worker, images, audio
  docs/              setup notes and SQL migrations
```

## Request paths

```text
Browser UI
  -> feature module
  -> service / data bridge
  -> /api/app route
  -> repository
  -> Supabase Postgres
```

`api/main.ts` is the Vercel API entry point. It dispatches `/api/app/*` paths to the handlers in `api/_routes/`.

## Where data belongs

| Data | Client entry point | Server repository |
| --- | --- | --- |
| Tracker, settings, routines, bookmarks | `src/services/data-bridge.ts` | `api/_lib/data/vault-repo.ts` |
| Tasks | `src/features/tasks/tasks.ts` | `api/_lib/data/vault-repo.ts` |
| Phases | `src/features/settings/settings.ts` | `api/_lib/data/vault-repo.ts` |
| Timer sessions and presence | `src/features/timer/timer.ts` | `api/_lib/data/study-repo.ts` / `profile-repo.ts` |
| Feed and feed notifications | `src/features/feed/` | `api/_lib/data/feed-repo.ts` |

## Things that are intentionally separate

- Browser notifications are local reminders while the app is running.
- Feed notifications are database records shown inside the feed bell.
- Focus presence is used by the leaderboard and may be used for an opt-in, privacy-aware reminder that another public user is studying.
- Maamu chat history is stored separately from the tracker vault.
