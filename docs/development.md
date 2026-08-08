# Development notes

This is the short version of how I work on AllTracker. The app is vanilla TypeScript on purpose. I like being able to trace a click, state update, save, API request, and database write without a framework hiding the path.

## Before changing anything

Run these before a deploy:

```bash
npm run typecheck
npm run build
```

If a change needs a database column or table, add a migration in `docs/` and run it in Supabase before deploying the code that expects it.

## Feature shape

Most frontend features live in `src/features/<feature>/`.

- `*.ts` contains event handling, state changes, and feature logic.
- `*.ui.ts` contains HTML/template helpers where a feature has them.
- Shared browser/API/storage work belongs in `src/services/`.

Keep template code simple. Do not hide business rules inside HTML strings.

## State and saving

`src/state/app-state.ts` holds the live client state. Arrays must be replaced instead of mutated in place, for example:

```ts
appState.tasks = [...appState.tasks, newTask];
```

That lets state subscribers re-render correctly.

For signed-in data, use `src/services/data-bridge.ts`. It writes the local cache immediately and then syncs through the API. The local cache makes reloads feel fast; the database is the long-term shared source of truth.

For records that users can create independently on multiple devices (tasks and phases), use record-level create/update/delete endpoints. Never take a partial browser list and interpret every missing record as a delete. A fresh phone can have an incomplete cache.

## API and database

The browser never connects directly to Postgres. The normal path is:

```text
feature -> data bridge / vault service -> /api/app/* -> repository -> Postgres
```

Route handlers are in `api/_routes/`. Query and data mapping code is in `api/_lib/data/`. Keep authorization in the route/repository path, and always scope reads/writes by the authenticated profile.

## Notifications

Browser notifications require permission from a real user click. AllTracker currently runs seven Maamu-style reminder slots per day while the app is open, plus routine alerts and a periodic check for public users who are actively studying.

This is not Web Push. A browser timer cannot send a notification after the tab/app has been closed. For reliable background mobile notifications, add Push API subscriptions, VAPID keys, a server-side sender, unsubscribe handling, quiet hours, and user preferences before enabling it for everyone.

## Useful places to inspect first

- `src/core/app-ignition.ts`: boot order.
- `src/services/data-bridge.ts`: cache and cloud reconciliation.
- `src/services/vault.service.ts`: typed frontend API calls.
- `api/_routes/vault/[name].ts`: user data endpoints.
- `api/_lib/data/vault-repo.ts`: tracker/tasks/phases database work.
- `src/features/notifications/notifications.ts`: reminder schedule and delivery.
