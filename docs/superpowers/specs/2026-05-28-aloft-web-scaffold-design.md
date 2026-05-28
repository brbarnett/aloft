# Aloft Web Scaffold — Design Spec

**Date:** 2026-05-28
**Scope:** Scaffold the single-file `aloft.jsx` prototype into a production-grade pnpm monorepo with a Vite + React + TypeScript web app and a service worker for notifications.

---

## 1. Repo Structure

```
aloft/
├── apps/
│   ├── web/           ← Vite + React + TypeScript (primary work)
│   └── api/           ← empty stub (README.md only)
├── packages/
│   └── types/         ← shared Plate/Task TypeScript types
├── docs/              ← existing, unchanged
├── Makefile           ← root-level commands
├── pnpm-workspace.yaml
└── package.json       ← workspace root (no app code)
```

`pnpm-workspace.yaml`:

```yaml
packages:
    - 'apps/*'
    - 'packages/*'
```

The `packages/types` stub is created now so import paths never need updating when the backend arrives. The `apps/api` stub is a `README.md` placeholder only.

---

## 2. `apps/web` File Structure

```
apps/web/
├── public/
│   ├── sw.js              ← service worker
│   └── manifest.json      ← PWA manifest
├── src/
│   ├── main.tsx           ← SW registration, app mount
│   ├── App.tsx            ← layout + section rendering
│   ├── index.css          ← Tailwind import + Google Fonts
│   ├── components/
│   │   └── PlateCard.tsx
│   ├── hooks/
│   │   └── usePlates.ts   ← all plate state and mutations
│   ├── utils/
│   │   ├── storage.ts     ← localStorage read/write helpers
│   │   └── notifications.ts ← SW registration + schedule helpers
│   └── types.ts           ← re-exports from @aloft/types
├── index.html
├── vite.config.ts
└── package.json
```

---

## 3. Styling

Tailwind CSS v4 everywhere possible. `src/index.css` contains only:

```css
@import 'tailwindcss';
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
```

**Colour mapping from prototype to Tailwind defaults:**

| Role            | Prototype hex | Tailwind token                      |
| --------------- | ------------- | ----------------------------------- |
| App background  | `#0f0f0f`     | `bg-zinc-950`                       |
| Card background | `#181818`     | `bg-zinc-900`                       |
| Card border     | `#2c2c2c`     | `border-zinc-800`                   |
| Primary text    | `#e8e4dc`     | `text-zinc-100`                     |
| Muted text      | `#555`        | `text-zinc-500`                     |
| Accent green    | `#c8f5a0`     | `text-lime-300` / `bg-lime-300`     |
| Snooze purple   | `#7a6fff`     | `text-violet-400` / `bg-violet-400` |

Raw CSS is acceptable as a fallback only for values Tailwind's utility scale cannot express (e.g. specific `box-shadow` glow values).

---

## 4. Shared Types (`packages/types`)

```
packages/types/
├── src/
│   └── index.ts      ← Plate, Task, AppData interfaces
└── package.json      ← name: "@aloft/types"
```

No build step. `package.json` exports the TypeScript source directly:

```json
{
    "name": "@aloft/types",
    "exports": { ".": "./src/index.ts" }
}
```

Vite resolves `.ts` source from workspace packages natively, so no compilation needed for `packages/types`. `apps/web/package.json` declares `"@aloft/types": "workspace:*"`.

`src/index.ts` exports the data model already defined in the prototype:

```ts
export interface Task {
    id: string;
    text: string;
    done: boolean;
}

export interface Plate {
    id: string;
    name: string;
    tasks: Task[];
    dismissedOn: string | null; // "YYYY-MM-DD" or null
    snoozedUntil: number | null; // unix ms or null
}

export interface AppData {
    plates: Plate[];
}
```

`apps/web/src/types.ts` re-exports from `@aloft/types`. Future `apps/api` will import the same package.

---

## 5. Service Worker + Notifications

**`public/sw.js`** handles a single message type:

```js
self.addEventListener('message', (event) => {
    if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
        const { title, body, delayMs } = event.data;
        setTimeout(() => self.registration.showNotification(title, { body }), delayMs);
    }
});
```

**`src/utils/notifications.ts`** exposes:

- `registerServiceWorker()` — called from `main.tsx` on load
- `scheduleWakeNotification(plate: Plate)` — posts `SCHEDULE_NOTIFICATION` to the SW with `delayMs = plate.snoozedUntil - Date.now()`
- `restoreSnoozedNotifications(plates: Plate[])` — called on app load; loops snoozed plates that haven't expired and reschedules their wake notifications (handles page refresh)

**Daily nudge (9am / 2pm):** remains a `setInterval` inside `usePlates` for now. Tab-dependent but acceptable until a backend scheduler exists.

---

## 6. Makefile

Root-level `Makefile` delegates to pnpm workspace commands:

```makefile
.PHONY: install dev build typecheck clean preview

install:
	pnpm install

dev:
	pnpm --filter @aloft/web dev

build:
	pnpm -r build

typecheck:
	pnpm -r --if-present run typecheck

preview:
	pnpm --filter @aloft/web preview

clean:
	find . -name 'dist' -not -path '*/node_modules/*' -exec rm -rf {} +
	find . -name 'node_modules' -maxdepth 3 -exec rm -rf {} +
```

`make build` automatically includes `apps/api` and `packages/types` when they have build scripts, with no Makefile changes required.

---

## 7. What Is Not In Scope

- Backend (`apps/api`) implementation
- Cross-device sync
- Push API / server-side scheduled notifications
- Mobile app
- Auth
- Turborepo or other build orchestration
