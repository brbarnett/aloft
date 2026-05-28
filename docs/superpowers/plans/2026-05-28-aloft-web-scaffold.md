# Aloft Web Scaffold — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate `docs/aloft.jsx` into a pnpm monorepo with Vite + React + TypeScript + Tailwind v4, structured for eventual backend and mobile additions.

**Architecture:** pnpm workspace with `apps/web` (Vite + React + TS), `apps/api` (README stub), and `packages/types` (source-only shared TS interfaces, no build step). Prototype logic is split into `usePlates.ts` (all state + mutations), `storage.ts` (localStorage), `notifications.ts` (SW helpers), `PlateCard/index.tsx` (component), `PlateCard/icons.tsx` (SVG icons), and `App.tsx` (layout). All styles are written as Tailwind utility classes using the default zinc/lime/violet palette; `clsx` is used for conditional class composition.

**Tech Stack:** pnpm workspaces, Vite 6, React 19, TypeScript 5, Tailwind CSS v4, `@tailwindcss/vite`, `clsx`

---

## File Map

**Workspace root**
- Create: `pnpm-workspace.yaml`
- Create: `package.json` (workspace root, private)
- Create: `.gitignore`
- Create: `Makefile`

**packages/types**
- Create: `packages/types/package.json` — name `@aloft/types`, exports `./src/index.ts` directly
- Create: `packages/types/src/index.ts` — `Task`, `Plate`, `AppData` interfaces

**apps/api**
- Create: `apps/api/README.md` — placeholder only

**apps/web** (scaffolded by `pnpm create vite`, then modified)
- Modify: `apps/web/package.json` — rename to `@aloft/web`, add `typecheck` script; deps added via `pnpm add`
- Modify: `apps/web/vite.config.ts` — add `@tailwindcss/vite` plugin
- Modify: `apps/web/index.html` — add manifest link, update title
- Replace: `apps/web/src/index.css` — Tailwind import + Google Fonts + font theme tokens
- Replace: `apps/web/src/main.tsx` — SW registration + app mount
- Replace: `apps/web/src/App.tsx` — full layout with Tailwind classes
- Delete: `apps/web/src/App.css` (Vite-generated, replaced by Tailwind)
- Delete: `apps/web/src/assets/` (Vite-generated demo assets)
- Create: `apps/web/src/types.ts` — re-exports from `@aloft/types`
- Create: `apps/web/src/utils/storage.ts` — localStorage helpers
- Create: `apps/web/src/utils/notifications.ts` — SW registration + schedule helpers
- Create: `apps/web/src/hooks/usePlates.ts` — all plate state and mutations
- Create: `apps/web/src/components/PlateCard/icons.tsx` — all SVG icon components
- Create: `apps/web/src/components/PlateCard/index.tsx` — full card component, Tailwind + clsx styled
- Create: `apps/web/public/sw.js` — service worker
- Create: `apps/web/public/manifest.json` — PWA manifest

---

## Task 1: Workspace Root

**Files:**
- Create: `pnpm-workspace.yaml`
- Create: `package.json`
- Create: `.gitignore`
- Create: `Makefile`

- [ ] **Step 1: Create `pnpm-workspace.yaml`**

```yaml
packages:
  - 'apps/*'
  - 'packages/*'
```

- [ ] **Step 2: Create root `package.json`**

```json
{
  "name": "aloft",
  "version": "0.0.0",
  "private": true
}
```

- [ ] **Step 3: Create `.gitignore`**

```
node_modules
dist
.env
.env.local
*.local
```

- [ ] **Step 4: Create `Makefile`**

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

Note: `Makefile` recipes must use real tab characters, not spaces. Confirm indentation before saving.

- [ ] **Step 5: Verify pnpm install works**

```bash
pnpm install
```
Expected: `Lockfile was successfully patched` or `Already up to date`. No errors.

- [ ] **Step 6: Commit**

```bash
git add pnpm-workspace.yaml package.json .gitignore Makefile
git commit -m "Add workspace root, Makefile, gitignore"
```

---

## Task 2: Shared Types + API Stub

**Files:**
- Create: `packages/types/package.json`
- Create: `packages/types/src/index.ts`
- Create: `apps/api/README.md`

- [ ] **Step 1: Create `packages/types/package.json`**

```json
{
  "name": "@aloft/types",
  "version": "0.0.0",
  "private": true,
  "exports": {
    ".": "./src/index.ts"
  }
}
```

- [ ] **Step 2: Create `packages/types/src/index.ts`**

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
  dismissedOn: string | null;
  snoozedUntil: number | null;
}

export interface AppData {
  plates: Plate[];
}
```

- [ ] **Step 3: Create `apps/api/README.md`**

```markdown
# api

Backend placeholder. Not yet implemented.
```

- [ ] **Step 4: Commit**

```bash
git add packages/ apps/api/
git commit -m "Add shared types package and api stub"
```

---

## Task 3: Scaffold apps/web

**Files:** Vite scaffold creates the base; we rename, add a script, then install additional deps.

- [ ] **Step 1: Scaffold the Vite app**

Run from repo root:
```bash
pnpm create vite@latest apps/web -- --template react-ts
```
Expected: `apps/web/` created with `src/`, `public/`, `index.html`, `package.json`, three `tsconfig*.json` files, `vite.config.ts`.

- [ ] **Step 2: Update name and scripts in `apps/web/package.json`**

Change the `"name"` field and add a `typecheck` script. Leave all dependency versions as Vite set them:
```json
{
  "name": "@aloft/web",
  ...
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview",
    "typecheck": "tsc -b"
  },
  ...
}
```

- [ ] **Step 3: Install workspace + runtime deps**

Run from repo root. pnpm resolves current versions automatically:
```bash
pnpm install
pnpm --filter @aloft/web add @aloft/types@workspace:* clsx
```
Expected: `@aloft/types` and `clsx` appear in `apps/web/package.json` dependencies with their resolved versions.

- [ ] **Step 4: Install Tailwind dev deps**

```bash
pnpm --filter @aloft/web add -D tailwindcss @tailwindcss/vite
```
Expected: Both packages appear in `apps/web/package.json` devDependencies.

- [ ] **Step 5: Verify the scaffold runs**

```bash
pnpm --filter @aloft/web dev
```
Expected: Vite dev server starts on `http://localhost:5173`. Open in browser — Vite + React demo page appears. Stop with Ctrl+C.

- [ ] **Step 6: Commit**

```bash
git add apps/web/
git commit -m "Scaffold apps/web with Vite + React + TS"
```

---

## Task 4: Configure Tailwind CSS v4

**Files:**
- Modify: `apps/web/vite.config.ts`
- Replace: `apps/web/src/index.css`

- [ ] **Step 1: Update `apps/web/vite.config.ts`**

```ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [
    tailwindcss(),
    react(),
  ],
})
```

- [ ] **Step 2: Replace `apps/web/src/index.css`**

```css
@import "tailwindcss";
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

@theme {
  --font-sans: 'DM Sans', sans-serif;
  --font-mono: 'DM Mono', monospace;
}
```

The `@theme` block overrides Tailwind's default `font-sans` and `font-mono` tokens so `className="font-sans"` and `className="font-mono"` resolve to DM Sans and DM Mono throughout the app.

- [ ] **Step 3: Verify Tailwind is wired up**

```bash
pnpm --filter @aloft/web dev
```
Expected: Dev server starts without errors. The Vite demo page will still render (now with Tailwind's CSS reset applied — default heading sizes will appear smaller). Stop with Ctrl+C.

- [ ] **Step 4: Commit**

```bash
git add apps/web/vite.config.ts apps/web/src/index.css
git commit -m "Configure Tailwind CSS v4"
```

---

## Task 5: Storage Utilities

**Files:**
- Create: `apps/web/src/utils/storage.ts`

- [ ] **Step 1: Create `apps/web/src/utils/storage.ts`**

```ts
import type { AppData } from '@aloft/types';

const STORAGE_KEY = 'aloft_v1';
const NOTIFICATION_KEY = 'aloft_notification_fired';

export interface NotificationState {
  date: string;
  morning: boolean;
  afternoon: boolean;
}

export const loadData = (): AppData => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') || { plates: [] };
    return {
      plates: (raw.plates ?? []).map((p: Record<string, unknown>) => ({
        ...p,
        snoozedUntil: (p.snoozedUntil as number | null | undefined) ?? null,
        dismissedOn: (p.dismissedOn as string | null | undefined) ?? null,
      })),
    };
  } catch {
    return { plates: [] };
  }
};

export const saveData = (data: AppData): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const loadNotificationState = (): NotificationState => {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_KEY) ?? '{}') || {};
  } catch {
    return {} as NotificationState;
  }
};

export const saveNotificationState = (state: NotificationState): void => {
  localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(state));
};
```

The `loadData` normalization ensures compatibility with existing prototype localStorage data where `snoozedUntil` may be absent on older plate records.

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @aloft/web typecheck
```
Expected: No errors. (The Vite-generated `App.tsx` may produce warnings — that's fine; it gets replaced in Task 9.)

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/utils/storage.ts
git commit -m "Add storage utilities"
```

---

## Task 6: Service Worker + Notification Utilities

**Files:**
- Create: `apps/web/public/sw.js`
- Create: `apps/web/src/utils/notifications.ts`

- [ ] **Step 1: Create `apps/web/public/sw.js`**

```js
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delayMs } = event.data;
    setTimeout(() => self.registration.showNotification(title, { body }), delayMs);
  }
});
```

- [ ] **Step 2: Create `apps/web/src/utils/notifications.ts`**

```ts
import type { Plate } from '@aloft/types';

export const registerServiceWorker = (): void => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
};

export const scheduleWakeNotification = (plate: Plate): void => {
  if (!plate.snoozedUntil) return;
  const delayMs = plate.snoozedUntil - Date.now();
  if (delayMs <= 0) return;
  navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      title: 'Aloft',
      body: 'Time to check back in.',
      delayMs,
    });
  });
};

export const restoreSnoozedNotifications = (plates: Plate[]): void => {
  plates
    .filter(p => p.snoozedUntil && p.snoozedUntil > Date.now())
    .forEach(scheduleWakeNotification);
};
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @aloft/web typecheck
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/public/sw.js apps/web/src/utils/notifications.ts
git commit -m "Add service worker and notification utilities"
```

---

## Task 7: usePlates Hook

**Files:**
- Create: `apps/web/src/hooks/usePlates.ts`

- [ ] **Step 1: Create `apps/web/src/hooks/usePlates.ts`**

```ts
import { useState, useEffect } from 'react';
import type { AppData, Plate } from '@aloft/types';
import { loadData, saveData, loadNotificationState, saveNotificationState } from '../utils/storage';
import { scheduleWakeNotification, restoreSnoozedNotifications } from '../utils/notifications';

export const getTodayStr = (): string => new Date().toISOString().split('T')[0];

export const isDismissedToday = (plate: Plate): boolean => {
  if (plate.dismissedOn === getTodayStr()) return true;
  if (plate.snoozedUntil && Date.now() < plate.snoozedUntil) return true;
  return false;
};

export const isSnoozed = (plate: Plate): boolean =>
  !!(plate.snoozedUntil && Date.now() < plate.snoozedUntil);

export const snoozeLabel = (plate: Plate): string => {
  if (!plate.snoozedUntil) return '';
  const diff = plate.snoozedUntil - Date.now();
  if (diff <= 0) return '';
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.ceil(diff / 3600000)}h`;
};

let idCounter = Date.now();
const newId = (): string => String(++idCounter);

export const usePlates = () => {
  const [data, setData] = useState<AppData>(loadData);
  const [notificationStatus, setNotificationStatus] = useState<string>(() => {
    try { return Notification.permission; }
    catch { return 'unsupported'; }
  });

  useEffect(() => { saveData(data); }, [data]);

  // Restore snoozed wake notifications after a page refresh
  useEffect(() => {
    restoreSnoozedNotifications(data.plates);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 9am / 2pm daily nudge (tab-dependent until backend exists)
  useEffect(() => {
    if (notificationStatus !== 'granted') return;
    const checkNotification = () => {
      const now = new Date();
      const today = getTodayStr();
      const hour = now.getHours();
      const state = loadNotificationState();
      const fired = state.date === today
        ? state
        : { date: today, morning: false, afternoon: false };
      const active = data.plates.filter(p => !isDismissedToday(p));
      if (active.length === 0) return;
      let updated = { ...fired };
      let shouldFire = false;
      if (hour >= 9 && hour < 14 && !fired.morning) {
        updated.morning = true;
        shouldFire = true;
      } else if (hour >= 14 && !fired.afternoon) {
        updated.afternoon = true;
        shouldFire = true;
      }
      if (!shouldFire) return;
      saveNotificationState(updated);
      try {
        new Notification('Aloft', {
          body: `${active.length} plate${active.length > 1 ? 's' : ''} still need attention.`,
          icon: '/favicon.ico',
        });
      } catch { /* not supported in this context */ }
    };
    checkNotification();
    const interval = setInterval(checkNotification, 60_000);
    return () => clearInterval(interval);
  }, [notificationStatus, data.plates]);

  const requestNotification = () => {
    try { Notification.requestPermission().then(p => setNotificationStatus(p)); }
    catch { setNotificationStatus('unsupported'); }
  };

  const addPlate = (name: string) => {
    setData(d => ({
      ...d,
      plates: [...d.plates, { id: newId(), name, tasks: [], dismissedOn: null, snoozedUntil: null }],
    }));
  };

  const deletePlate = (id: string) => {
    setData(d => ({ ...d, plates: d.plates.filter(p => p.id !== id) }));
  };

  const dismissPlate = (id: string) => {
    setData(d => ({
      ...d,
      plates: d.plates.map(p => p.id === id ? { ...p, dismissedOn: getTodayStr() } : p),
    }));
  };

  const undoDismiss = (id: string) => {
    setData(d => ({
      ...d,
      plates: d.plates.map(p => p.id === id ? { ...p, dismissedOn: null, snoozedUntil: null } : p),
    }));
  };

  const snoozePlate = (id: string, ms: number | null) => {
    const until = ms === null
      ? (() => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); })()
      : Date.now() + ms;
    setData(d => ({
      ...d,
      plates: d.plates.map(p => p.id === id ? { ...p, snoozedUntil: until, dismissedOn: null } : p),
    }));
    scheduleWakeNotification({ snoozedUntil: until } as Plate);
  };

  const renamePlate = (id: string, name: string) => {
    setData(d => ({ ...d, plates: d.plates.map(p => p.id === id ? { ...p, name } : p) }));
  };

  const addTask = (plateId: string, text: string) => {
    setData(d => ({
      ...d,
      plates: d.plates.map(p =>
        p.id === plateId ? { ...p, tasks: [...p.tasks, { id: newId(), text, done: false }] } : p
      ),
    }));
  };

  const toggleTask = (plateId: string, taskId: string) => {
    setData(d => ({
      ...d,
      plates: d.plates.map(p =>
        p.id === plateId
          ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) }
          : p
      ),
    }));
  };

  const deleteTask = (plateId: string, taskId: string) => {
    setData(d => ({
      ...d,
      plates: d.plates.map(p =>
        p.id === plateId ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) } : p
      ),
    }));
  };

  const editTask = (plateId: string, taskId: string, text: string) => {
    setData(d => ({
      ...d,
      plates: d.plates.map(p =>
        p.id === plateId
          ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, text } : t) }
          : p
      ),
    }));
  };

  return {
    data,
    active: data.plates.filter(p => !isDismissedToday(p)),
    done: data.plates.filter(p => isDismissedToday(p)),
    notificationStatus,
    requestNotification,
    addPlate,
    deletePlate,
    dismissPlate,
    undoDismiss,
    snoozePlate,
    renamePlate,
    addTask,
    toggleTask,
    deleteTask,
    editTask,
  };
};
```

- [ ] **Step 2: Type-check**

```bash
pnpm --filter @aloft/web typecheck
```
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/hooks/usePlates.ts
git commit -m "Add usePlates hook"
```

---

## Task 8: PlateCard Component

**Files:**
- Create: `apps/web/src/components/PlateCard/icons.tsx`
- Create: `apps/web/src/components/PlateCard/index.tsx`

- [ ] **Step 1: Create `apps/web/src/components/PlateCard/icons.tsx`**

```tsx
export const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);

export const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconSnooze = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 5.5v3l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5.5 1.5l-2 2M10.5 1.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5A4.5 4.5 0 003.5 6v3.5L2 11h12l-1.5-1.5V6A4.5 4.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

export const IconChevron = ({ open }: { open: boolean }) => (
  <svg
    width="14" height="14" viewBox="0 0 16 16" fill="none"
    style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
  >
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export const IconUndo = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M3 7V3L1 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 5a6 6 0 106 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);

export const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
```

- [ ] **Step 2: Create `apps/web/src/components/PlateCard/index.tsx`**

```tsx
import { useState, useEffect } from 'react';
import clsx from 'clsx';
import type { Plate, Task } from '@aloft/types';
import { isDismissedToday, isSnoozed, snoozeLabel } from '../../hooks/usePlates';
import {
  IconCheck, IconPlus, IconTrash, IconSnooze,
  IconBell, IconChevron, IconUndo, IconEdit,
} from './icons';

const SNOOZE_OPTIONS: { label: string; ms: number | null }[] = [
  { label: '20 min', ms: 20 * 60 * 1000 },
  { label: '1 hr',  ms: 60 * 60 * 1000 },
  { label: '2 hr',  ms: 2 * 60 * 60 * 1000 },
  { label: 'Tomorrow', ms: null },
];

interface Props {
  plate: Plate;
  onDismiss: (id: string) => void;
  onUndoDismiss: (id: string) => void;
  onSnooze: (id: string, ms: number | null) => void;
  onAddTask: (plateId: string, text: string) => void;
  onToggleTask: (plateId: string, taskId: string) => void;
  onDeleteTask: (plateId: string, taskId: string) => void;
  onDelete: (id: string) => void;
  onRenamePlate: (id: string, name: string) => void;
  onEditTask: (plateId: string, taskId: string, text: string) => void;
}

const PlateCard = ({
  plate, onDismiss, onUndoDismiss, onSnooze,
  onAddTask, onToggleTask, onDeleteTask, onDelete,
  onRenamePlate, onEditTask,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(plate.name);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskVal, setEditingTaskVal] = useState('');
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [, forceUpdate] = useState(0);

  // Re-render every 30s to keep snooze countdown accurate
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const dismissed = isDismissedToday(plate);
  const snoozed = isSnoozed(plate);
  const doneTasks = plate.tasks.filter(t => t.done);

  const cardClass = clsx(
    'rounded-xl mb-2 transition-all',
    snoozed  && 'bg-zinc-900/70 border border-zinc-800/60 opacity-75',
    dismissed && !snoozed && 'bg-zinc-950 border border-zinc-900 opacity-60',
    !dismissed && !snoozed && 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700',
  );

  const dotClass = clsx(
    'w-2 h-2 rounded-full shrink-0',
    snoozed  && 'bg-violet-400 shadow-[0_0_8px_#7c3aed44]',
    dismissed && !snoozed && 'bg-zinc-700',
    !dismissed && !snoozed && 'bg-lime-300 shadow-[0_0_8px_#bef26444]',
  );

  const commitRename = () => {
    const v = nameVal.trim();
    if (v && v !== plate.name) onRenamePlate(plate.id, v);
    else setNameVal(plate.name);
    setEditingName(false);
  };

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskVal(task.text);
  };

  const commitEditTask = () => {
    const v = editingTaskVal.trim();
    if (v && editingTaskId) onEditTask(plate.id, editingTaskId, v);
    setEditingTaskId(null);
    setEditingTaskVal('');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskInput.trim()) { onAddTask(plate.id, taskInput.trim()); setTaskInput(''); }
  };

  return (
    <div className={cardClass}>
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none"
        onClick={() => !editingName && setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={dotClass} />
          {editingName ? (
            <input
              className="bg-zinc-950 border border-zinc-700 rounded text-zinc-100 text-[15px] font-medium px-2 py-0.5 outline-none flex-1 min-w-0"
              value={nameVal}
              autoFocus
              onChange={e => setNameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setNameVal(plate.name); setEditingName(false); }
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className={clsx('text-[15px] font-medium truncate', dismissed ? 'text-zinc-600' : 'text-zinc-300')}>
              {plate.name}
            </span>
          )}
          {plate.tasks.length > 0 && (
            <span className="font-mono text-[11px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full shrink-0">
              {doneTasks.length}/{plate.tasks.length}
            </span>
          )}
          {snoozed && (
            <span className="font-mono text-[11px] bg-violet-950 text-violet-400 px-1.5 py-0.5 rounded-full shrink-0">
              ⏱ {snoozeLabel(plate)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="bg-transparent border-none cursor-pointer text-zinc-600 p-1 rounded flex items-center transition-colors hover:text-zinc-400"
            onClick={e => { e.stopPropagation(); setEditingName(true); setExpanded(true); }}
            title="Rename"
          >
            <IconEdit />
          </button>
          <button
            className="bg-transparent border-none cursor-pointer text-zinc-600 p-1 rounded flex items-center transition-colors hover:text-red-400"
            onClick={e => { e.stopPropagation(); onDelete(plate.id); }}
            title="Delete"
          >
            <IconTrash />
          </button>
          <IconChevron open={expanded} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800/50">
          {plate.tasks.length > 0 && (
            <div className="pt-3 flex flex-col gap-1.5">
              {plate.tasks.map(task => (
                <div key={task.id} className="flex items-center gap-2">
                  <button
                    className={clsx(
                      'w-[18px] h-[18px] rounded border bg-transparent cursor-pointer flex items-center justify-center shrink-0 transition-all',
                      task.done
                        ? 'bg-lime-300 border-lime-300 text-zinc-950'
                        : 'border-zinc-700 text-transparent hover:border-lime-300',
                    )}
                    onClick={() => onToggleTask(plate.id, task.id)}
                  >
                    {task.done && <IconCheck />}
                  </button>
                  {editingTaskId === task.id ? (
                    <input
                      className="bg-zinc-950 border border-zinc-800 rounded-md text-zinc-400 text-[13px] px-2.5 py-1.5 flex-1 outline-none focus:border-zinc-700"
                      value={editingTaskVal}
                      autoFocus
                      onChange={e => setEditingTaskVal(e.target.value)}
                      onBlur={commitEditTask}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEditTask();
                        if (e.key === 'Escape') setEditingTaskId(null);
                      }}
                    />
                  ) : (
                    <span
                      className={clsx('text-[13px] flex-1', task.done ? 'line-through text-zinc-600' : 'text-zinc-400')}
                      onDoubleClick={() => !task.done && startEditTask(task)}
                    >
                      {task.text}
                    </span>
                  )}
                  {editingTaskId !== task.id && (
                    <>
                      {!task.done && (
                        <button
                          className="bg-transparent border-none cursor-pointer text-zinc-600 p-1 rounded flex items-center transition-colors hover:text-zinc-400"
                          onClick={() => startEditTask(task)}
                          title="Edit"
                        >
                          <IconEdit />
                        </button>
                      )}
                      <button
                        className="bg-transparent border-none cursor-pointer text-zinc-600 p-1 rounded flex items-center transition-colors hover:text-red-400"
                        onClick={() => onDeleteTask(plate.id, task.id)}
                      >
                        <IconTrash />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <form className="flex items-center gap-1.5 mt-2.5" onSubmit={handleAddTask}>
            <input
              className="bg-zinc-950 border border-zinc-800 rounded-md text-zinc-400 text-[13px] px-2.5 py-1.5 flex-1 outline-none transition-colors focus:border-zinc-700 placeholder:text-zinc-700"
              placeholder="Add a task..."
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
            />
            <button
              type="submit"
              className="bg-transparent border-none cursor-pointer text-zinc-500 p-1 rounded flex items-center transition-colors disabled:opacity-30 disabled:cursor-default enabled:hover:text-lime-300"
              disabled={!taskInput.trim()}
            >
              <IconPlus />
            </button>
          </form>

          {!dismissed && (
            <div className="mt-3 flex gap-2 items-center flex-wrap">
              <button
                className="bg-lime-950 border border-lime-900 text-lime-300 text-xs font-medium px-3.5 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-all hover:bg-lime-900"
                onClick={() => onDismiss(plate.id)}
              >
                <IconSnooze /> Done for today
              </button>
              <div className="relative">
                <button
                  className="bg-violet-950 border border-violet-900 text-violet-400 text-xs font-medium px-3.5 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-all hover:bg-violet-900"
                  onClick={() => setShowSnoozeMenu(v => !v)}
                >
                  <IconBell /> Snooze
                </button>
                {showSnoozeMenu && (
                  <div className="absolute top-[calc(100%+6px)] left-0 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden z-[100] min-w-[110px] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                    {SNOOZE_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        className="block w-full bg-transparent border-none text-zinc-400 text-[13px] px-3.5 py-2.5 text-left cursor-pointer transition-colors hover:bg-zinc-800 hover:text-violet-400"
                        onClick={() => { onSnooze(plate.id, opt.ms); setShowSnoozeMenu(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {snoozed && (
            <div className="mt-3 flex items-center text-xs">
              <span className="text-zinc-700">Snoozed for {snoozeLabel(plate)}</span>
              <button
                className="bg-transparent border border-zinc-800 text-zinc-500 text-[11px] px-2.5 py-1 rounded cursor-pointer inline-flex items-center gap-1.5 ml-2.5 transition-all hover:text-lime-300 hover:border-lime-900"
                onClick={() => onUndoDismiss(plate.id)}
              >
                <IconUndo /> Wake
              </button>
            </div>
          )}

          {dismissed && !snoozed && (
            <div className="mt-3 flex items-center text-xs">
              <span className="text-zinc-700">Dismissed — see you tomorrow</span>
              <button
                className="bg-transparent border border-zinc-800 text-zinc-500 text-[11px] px-2.5 py-1 rounded cursor-pointer inline-flex items-center gap-1.5 ml-2.5 transition-all hover:text-lime-300 hover:border-lime-900"
                onClick={() => onUndoDismiss(plate.id)}
              >
                <IconUndo /> Undo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlateCard;
```

- [ ] **Step 3: Type-check**

```bash
pnpm --filter @aloft/web typecheck
```
Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/
git commit -m "Add PlateCard component with icons"
```

---

## Task 9: App, Main, Types Re-export + Cleanup

**Files:**
- Replace: `apps/web/src/App.tsx`
- Replace: `apps/web/src/main.tsx`
- Create: `apps/web/src/types.ts`
- Modify: `apps/web/index.html`
- Create: `apps/web/public/manifest.json`
- Delete: `apps/web/src/App.css`
- Delete: `apps/web/src/assets/`

- [ ] **Step 1: Replace `apps/web/src/App.tsx`**

```tsx
import { useState } from 'react';
import { usePlates } from './hooks/usePlates';
import PlateCard from './components/PlateCard';

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5A4.5 4.5 0 003.5 6v3.5L2 11h12l-1.5-1.5V6A4.5 4.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const App = () => {
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const {
    data, active, done, notificationStatus, requestNotification,
    addPlate, deletePlate, dismissPlate, undoDismiss,
    snoozePlate, renamePlate, addTask, toggleTask, deleteTask, editTask,
  } = usePlates();

  const handleAddPlate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addPlate(newName.trim());
    setNewName('');
    setShowAdd(false);
  };

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen font-sans">
      <div className="max-w-[560px] mx-auto px-5 pt-10 pb-20">

        <div className="flex items-end justify-between mb-9">
          <div>
            <h1 className="font-mono text-[28px] font-medium tracking-tight">aloft</h1>
            <div className="text-xs text-zinc-600 font-mono mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <span className="font-mono text-[13px] text-zinc-500">
              <span className="text-lime-300">{done.length}</span>/{data.plates.length}
            </span>
            {notificationStatus !== 'unsupported' && (
              <button
                className={`bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-md cursor-pointer text-xs flex items-center gap-1.5 transition-all hover:border-zinc-700 ${
                  notificationStatus === 'granted' ? 'text-lime-300' : 'text-zinc-500 hover:text-zinc-400'
                }`}
                onClick={requestNotification}
                title="Enable daily notifications"
              >
                <IconBell />
                {notificationStatus === 'granted' ? 'on' : 'notify'}
              </button>
            )}
          </div>
        </div>

        {active.length > 0 && (
          <>
            <div className="font-mono text-[10px] tracking-[2px] uppercase text-zinc-600 mb-2.5 mt-7">
              needs attention
            </div>
            {active.map(plate => (
              <PlateCard key={plate.id} plate={plate}
                onDismiss={dismissPlate} onUndoDismiss={undoDismiss} onSnooze={snoozePlate}
                onAddTask={addTask} onToggleTask={toggleTask} onDeleteTask={deleteTask}
                onDelete={deletePlate} onRenamePlate={renamePlate} onEditTask={editTask}
              />
            ))}
          </>
        )}

        {done.length > 0 && (
          <>
            {done.length === data.plates.length && (
              <div className="bg-lime-950 border border-lime-900 rounded-xl px-5 py-4 text-center text-[13px] text-lime-300 font-mono mb-2">
                ✓ all plates spun for today
              </div>
            )}
            <div className="font-mono text-[10px] tracking-[2px] uppercase text-zinc-600 mb-2.5 mt-7">
              done today
            </div>
            {done.map(plate => (
              <PlateCard key={plate.id} plate={plate}
                onDismiss={dismissPlate} onUndoDismiss={undoDismiss} onSnooze={snoozePlate}
                onAddTask={addTask} onToggleTask={toggleTask} onDeleteTask={deleteTask}
                onDelete={deletePlate} onRenamePlate={renamePlate} onEditTask={editTask}
              />
            ))}
          </>
        )}

        {data.plates.length === 0 && (
          <div className="text-center py-10 text-zinc-700 text-[13px] font-mono">
            no plates yet — add one below
          </div>
        )}

        <div className="mt-7">
          {showAdd ? (
            <form className="flex gap-2" onSubmit={handleAddPlate}>
              <input
                className="bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-[15px] font-medium px-3.5 py-3 flex-1 outline-none transition-colors focus:border-zinc-700 placeholder:text-zinc-700"
                placeholder="Plate name..."
                value={newName}
                autoFocus
                onChange={e => setNewName(e.target.value)}
              />
              <button
                type="button"
                className="bg-transparent border border-zinc-800 text-zinc-500 text-[13px] px-3.5 py-3 rounded-lg cursor-pointer transition-all hover:text-zinc-300 hover:border-zinc-700"
                onClick={() => { setShowAdd(false); setNewName(''); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-lime-300 text-zinc-950 text-[13px] font-semibold px-[18px] py-3 rounded-lg cursor-pointer transition-all hover:bg-lime-200 disabled:opacity-30 disabled:cursor-default whitespace-nowrap"
                disabled={!newName.trim()}
              >
                Add
              </button>
            </form>
          ) : (
            <button
              className="bg-transparent border border-dashed border-zinc-800 text-zinc-600 text-[13px] py-3 px-4 rounded-xl cursor-pointer w-full flex items-center gap-2 transition-all hover:border-zinc-700 hover:text-zinc-500"
              onClick={() => setShowAdd(true)}
            >
              <IconPlus /> Add plate
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default App;
```

- [ ] **Step 2: Replace `apps/web/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerServiceWorker } from './utils/notifications';
import './index.css';
import App from './App';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

- [ ] **Step 3: Create `apps/web/src/types.ts`**

```ts
export type { Task, Plate, AppData } from '@aloft/types';
```

- [ ] **Step 4: Update `apps/web/index.html`**

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <meta name="theme-color" content="#09090b" />
    <link rel="manifest" href="/manifest.json" />
    <title>Aloft</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

- [ ] **Step 5: Create `apps/web/public/manifest.json`**

```json
{
  "name": "Aloft",
  "short_name": "Aloft",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#09090b",
  "theme_color": "#09090b",
  "icons": []
}
```

- [ ] **Step 6: Delete Vite-generated files**

```bash
rm apps/web/src/App.css
rm -rf apps/web/src/assets
```

- [ ] **Step 7: Type-check**

```bash
pnpm --filter @aloft/web typecheck
```
Expected: No errors.

- [ ] **Step 8: Commit**

```bash
git add apps/web/src/ apps/web/index.html apps/web/public/manifest.json
git commit -m "Migrate prototype to Vite + React + TS + Tailwind"
```

---

## Task 10: Final Verification

- [ ] **Step 1: Full typecheck across all packages**

```bash
make typecheck
```
Expected: Exits 0, no TypeScript errors.

- [ ] **Step 2: Start dev server**

```bash
make dev
```
Expected: Vite starts on `http://localhost:5173`.

- [ ] **Step 3: Browser smoke test**

Open `http://localhost:5173`. Verify:
- Dark background (`zinc-950`), "aloft" heading in monospace (DM Mono)
- Date string displayed below heading
- "no plates yet — add one below" empty state
- Click "Add plate" → input + Cancel + Add buttons appear
- Add a plate → card appears in "needs attention" section with green dot
- Expand plate → task input, "Done for today", "Snooze" buttons visible
- Add a task → appears in task list
- Toggle task → checkbox turns lime, text gets strikethrough
- "Done for today" → card moves to "done today" section, opacity dims
- "Undo" → card returns to active
- "Snooze → 20 min" → card shows purple dot and ⏱ badge
- "Wake" → card returns to active
- All plates dismissed → "✓ all plates spun for today" banner appears
- Notification "notify" button visible (unless already granted)

- [ ] **Step 4: Commit any fixups found during smoke test**

If issues were found and fixed in Step 3:
```bash
git add -p
git commit -m "Fix smoke test issues"
```
If no issues, skip this step.
