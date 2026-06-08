# Backend Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Fastify backend to `apps/api` that stores `AppData` as a JSON file on disk, replacing localStorage in the frontend.

**Architecture:** Fastify on port 3001 exposes `GET /api/data` and `PUT /api/data`. Vite proxies `/api/*` to the backend in dev. All FlightsContext actions save the new state inline within their `setData` callbacks; the blanket `useEffect` save is removed. Text-edit actions (`renameFlight`, `editWaypoint`, `setNote`) are already called only on blur in components, so no component changes are needed.

**Tech Stack:** Fastify 5, tsx (dev runner), TypeScript, pnpm workspaces, Vite proxy

---

## File Map

**Create:**

- `apps/api/package.json` — package config with Fastify + tsx deps
- `apps/api/tsconfig.json` — TypeScript config for Node ESM
- `apps/api/.gitignore` — ignore data/ and dist/
- `apps/api/src/data.ts` — JSON file read/write helpers
- `apps/api/src/index.ts` — Fastify server with GET/PUT routes

**Modify:**

- `apps/web/vite.config.ts` — add `server.proxy` for `/api`
- `apps/web/src/utils/storage.ts` — replace localStorage with async fetch
- `apps/web/src/context/FlightsContext.tsx` — async load on mount, inline saves per action, `loading` state

---

### Task 1: Bootstrap apps/api

**Files:**

- Create: `apps/api/package.json`
- Create: `apps/api/tsconfig.json`
- Create: `apps/api/.gitignore`

- [ ] **Step 1: Create `apps/api/package.json`**

```json
{
    "name": "@aloft/api",
    "version": "0.0.0",
    "private": true,
    "type": "module",
    "scripts": {
        "dev": "tsx watch src/index.ts",
        "build": "tsc",
        "start": "node dist/index.js"
    },
    "dependencies": {
        "@aloft/types": "workspace:*",
        "fastify": "^5.0.0"
    },
    "devDependencies": {
        "@types/node": "^24.12.3",
        "tsx": "^4.19.4",
        "typescript": "~6.0.2"
    }
}
```

- [ ] **Step 2: Create `apps/api/tsconfig.json`**

```json
{
    "compilerOptions": {
        "target": "ES2022",
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "outDir": "dist",
        "rootDir": "src",
        "strict": true,
        "esModuleInterop": true
    },
    "include": ["src"]
}
```

- [ ] **Step 3: Create `apps/api/.gitignore`**

```
data/
dist/
node_modules/
```

- [ ] **Step 4: Install dependencies**

Run from the repo root:

```bash
pnpm install
```

Expected: pnpm resolves `@aloft/types` from the workspace and installs `fastify` and `tsx` in `apps/api/node_modules`.

- [ ] **Step 5: Commit**

```bash
git add apps/api/package.json apps/api/tsconfig.json apps/api/.gitignore pnpm-lock.yaml
git commit -m "Bootstrap apps/api with Fastify and tsx"
```

---

### Task 2: Implement data file helpers

**Files:**

- Create: `apps/api/src/data.ts`

- [ ] **Step 1: Create `apps/api/src/data.ts`**

```typescript
import type { AppData } from '@aloft/types';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = join(dirname(fileURLToPath(import.meta.url)), '..', 'data');
const file = join(dir, 'appdata.json');

export const readAppData = async (): Promise<AppData> => {
    try {
        const raw = await readFile(file, 'utf-8');
        return JSON.parse(raw) as AppData;
    } catch {
        return { flights: [] };
    }
};

export const writeAppData = async (data: AppData): Promise<void> => {
    await mkdir(dir, { recursive: true });
    await writeFile(file, JSON.stringify(data, null, 2), 'utf-8');
};
```

- [ ] **Step 2: Commit**

```bash
git add apps/api/src/data.ts
git commit -m "Add JSON file read/write helpers for AppData"
```

---

### Task 3: Implement Fastify server with GET and PUT routes

**Files:**

- Create: `apps/api/src/index.ts`

- [ ] **Step 1: Create `apps/api/src/index.ts`**

```typescript
import type { AppData } from '@aloft/types';
import Fastify from 'fastify';
import { readAppData, writeAppData } from './data.js';

const server = Fastify({ logger: true });

server.get('/api/data', async () => {
    return readAppData();
});

const bodySchema = {
    body: {
        type: 'object',
        required: ['flights'],
        properties: {
            flights: { type: 'array' },
        },
    },
};

server.put<{ Body: AppData }>('/api/data', { schema: bodySchema }, async (request) => {
    await writeAppData(request.body);
    return request.body;
});

const start = async () => {
    try {
        await server.listen({ port: 3001, host: '127.0.0.1' });
    } catch (err) {
        server.log.error(err);
        process.exit(1);
    }
};

start();
```

- [ ] **Step 2: Verify the server starts**

In `apps/api/`, run:

```bash
pnpm dev
```

Expected output includes:

```
Server listening at http://127.0.0.1:3001
```

In a separate terminal, test the endpoints:

```bash
curl http://localhost:3001/api/data
# Expected: {"flights":[]}

curl -X PUT http://localhost:3001/api/data \
  -H "Content-Type: application/json" \
  -d '{"flights":[{"id":"1","callsign":"TST-01","name":"Test","tasks":[],"note":null,"dismissedOn":null,"snoozedUntil":null}]}'
# Expected: echoes back the AppData

curl http://localhost:3001/api/data
# Expected: the AppData you just PUT, now read from disk
```

Stop the server with Ctrl+C.

- [ ] **Step 3: Commit**

```bash
git add apps/api/src/index.ts
git commit -m "Add Fastify server with GET and PUT /api/data"
```

---

### Task 4: Add Vite proxy

**Files:**

- Modify: `apps/web/vite.config.ts`

- [ ] **Step 1: Update `apps/web/vite.config.ts`**

Replace the entire file with:

```typescript
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [tailwindcss(), react()],
    server: {
        proxy: {
            '/api': 'http://127.0.0.1:3001',
        },
    },
});
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/vite.config.ts
git commit -m "Proxy /api to backend in Vite dev server"
```

---

### Task 5: Replace storage.ts with async fetch wrappers

**Files:**

- Modify: `apps/web/src/utils/storage.ts`

- [ ] **Step 1: Replace `apps/web/src/utils/storage.ts`**

The notification state stays in localStorage. Only `loadData` and `saveData` move to the API.

```typescript
import type { AppData } from '@aloft/types';

const NOTIFICATION_KEY = 'aloft_notification_fired';

export interface NotificationState {
    date: string;
    morning: boolean;
    afternoon: boolean;
}

export const loadData = async (): Promise<AppData> => {
    try {
        const res = await fetch('/api/data');
        if (!res.ok) return { flights: [] };
        return res.json() as Promise<AppData>;
    } catch {
        return { flights: [] };
    }
};

export const saveData = async (data: AppData): Promise<void> => {
    try {
        await fetch('/api/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    } catch {
        // fire-and-forget: log silently, don't crash the UI
        console.error('Failed to save data to backend');
    }
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

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/utils/storage.ts
git commit -m "Replace localStorage load/save with async fetch to backend"
```

---

### Task 6: Update FlightsContext — async load and inline saves

**Files:**

- Modify: `apps/web/src/context/FlightsContext.tsx`

The key changes:

1. `useState<AppData>({ flights: [] })` — empty initial state instead of sync `loadData()`
2. `useEffect` on mount calls `loadData()` async, sets `loading` state
3. Remove `useEffect(() => { saveData(data) }, [data])` entirely
4. Every action that mutates state calls `saveData(next)` inside its `setData` callback, where `next` is the computed new state
5. Add `loading: boolean` to `FlightsContextValue`

- [ ] **Step 1: Replace `apps/web/src/context/FlightsContext.tsx`**

```typescript
import { createContext, useContext, useEffect, useState } from 'react';
import type { AppData, Flight } from '@aloft/types';
import { restoreSnoozedNotifications, scheduleWakeNotification } from '../utils/notifications';
import { loadData, loadNotificationState, saveData, saveNotificationState } from '../utils/storage';

const generateCallsign = (name: string): string => {
    const words = name.trim().split(/\s+/);
    const letters = words.slice(0, 3).map((w) => w[0]?.toUpperCase() ?? 'X');
    while (letters.length < 3) letters.push('X');
    const num = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    return `${letters.join('')}-${num}`;
};

export const getTodayStr = (): string => new Date().toISOString().split('T')[0];

export const isDismissedToday = (flight: Flight): boolean => {
    if (flight.dismissedOn === getTodayStr()) return true;
    if (flight.snoozedUntil && Date.now() < flight.snoozedUntil) return true;
    return false;
};

export const isSnoozed = (flight: Flight): boolean => !!(flight.snoozedUntil && Date.now() < flight.snoozedUntil);

export const snoozeLabel = (flight: Flight): string => {
    if (!flight.snoozedUntil) return '';
    const diff = flight.snoozedUntil - Date.now();
    if (diff <= 0) return '';
    const mins = Math.ceil(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.ceil(diff / 3600000)}h`;
};

let idCounter = Date.now();
export const newId = (): string => String(++idCounter);

export interface FlightsContextValue {
    data: AppData;
    loading: boolean;
    active: Flight[];
    done: Flight[];
    notificationStatus: string;
    requestNotification: () => void;
    addFlight: (name: string) => void;
    deleteFlight: (id: string) => void;
    dismissFlight: (id: string) => void;
    undoDismiss: (id: string) => void;
    snoozeFlight: (id: string, until: number) => void;
    renameFlight: (id: string, name: string) => void;
    setNote: (id: string, note: string | null) => void;
    addWaypoint: (flightId: string, text: string) => void;
    toggleWaypoint: (flightId: string, taskId: string) => void;
    deleteWaypoint: (flightId: string, taskId: string) => void;
    editWaypoint: (flightId: string, taskId: string, text: string) => void;
    toggleWaypointExpedite: (flightId: string, taskId: string) => void;
}

const FlightsContext = createContext<FlightsContextValue | null>(null);

export const FlightsProvider = ({ children }: { children: React.ReactNode }) => {
    const [data, setData] = useState<AppData>({ flights: [] });
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0);
    const [notificationStatus, setNotificationStatus] = useState<string>(() => {
        try {
            return Notification.permission;
        } catch {
            return 'unsupported';
        }
    });

    useEffect(() => {
        loadData().then((d) => {
            setData(d);
            setLoading(false);
            restoreSnoozedNotifications(d.flights);
        });
    }, []);

    useEffect(() => {
        const snoozed = data.flights.filter((f) => f.snoozedUntil && f.snoozedUntil > Date.now());
        if (snoozed.length === 0) return;
        const earliest = Math.min(...snoozed.map((f) => f.snoozedUntil!));
        const timer = setTimeout(() => setTick((n) => n + 1), earliest - Date.now());
        return () => clearTimeout(timer);
    }, [data.flights]);

    useEffect(() => {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        const timer = setTimeout(() => setTick((n) => n + 1), midnight.getTime() - Date.now());
        return () => clearTimeout(timer);
    }, [tick]);

    useEffect(() => {
        if (notificationStatus !== 'granted') return;
        const checkNotification = () => {
            const now = new Date();
            const today = getTodayStr();
            const hour = now.getHours();
            const state = loadNotificationState();
            const fired = state.date === today ? state : { date: today, morning: false, afternoon: false };
            const active = data.flights.filter((f) => !isDismissedToday(f));
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
                    body: `${active.length} flight${active.length > 1 ? 's' : ''} still airborne.`,
                    icon: '/favicon.ico',
                });
            } catch {
                /* not supported in this context */
            }
        };
        checkNotification();
        const interval = setInterval(checkNotification, 60_000);
        return () => clearInterval(interval);
    }, [notificationStatus, data.flights]);

    const requestNotification = () => {
        try {
            Notification.requestPermission().then((p) => setNotificationStatus(p));
        } catch {
            setNotificationStatus('unsupported');
        }
    };

    const addFlight = (name: string) => {
        setData((d) => {
            const next = {
                ...d,
                flights: [
                    ...d.flights,
                    {
                        id: newId(),
                        callsign: generateCallsign(name),
                        name,
                        tasks: [],
                        note: null,
                        dismissedOn: null,
                        snoozedUntil: null,
                    },
                ],
            };
            saveData(next);
            return next;
        });
    };

    const deleteFlight = (id: string) => {
        setData((d) => {
            const next = { ...d, flights: d.flights.filter((f) => f.id !== id) };
            saveData(next);
            return next;
        });
    };

    const dismissFlight = (id: string) => {
        setData((d) => {
            const next = {
                ...d,
                flights: d.flights.map((f) =>
                    f.id === id ? { ...f, tasks: f.tasks.filter((t) => !t.done), dismissedOn: getTodayStr() } : f,
                ),
            };
            saveData(next);
            return next;
        });
    };

    const undoDismiss = (id: string) => {
        setData((d) => {
            const next = {
                ...d,
                flights: d.flights.map((f) => (f.id === id ? { ...f, dismissedOn: null, snoozedUntil: null } : f)),
            };
            saveData(next);
            return next;
        });
    };

    const snoozeFlight = (id: string, until: number) => {
        setData((d) => {
            const next = {
                ...d,
                flights: d.flights.map((f) => (f.id === id ? { ...f, snoozedUntil: until, dismissedOn: null } : f)),
            };
            saveData(next);
            return next;
        });
        scheduleWakeNotification({ snoozedUntil: until } as Flight);
    };

    const renameFlight = (id: string, name: string) => {
        setData((d) => {
            const next = { ...d, flights: d.flights.map((f) => (f.id === id ? { ...f, name } : f)) };
            saveData(next);
            return next;
        });
    };

    const setNote = (id: string, note: string | null) => {
        setData((d) => {
            const next = { ...d, flights: d.flights.map((f) => (f.id === id ? { ...f, note } : f)) };
            saveData(next);
            return next;
        });
    };

    const addWaypoint = (flightId: string, text: string) => {
        setData((d) => {
            const next = {
                ...d,
                flights: d.flights.map((f) =>
                    f.id === flightId ? { ...f, tasks: [...f.tasks, { id: newId(), text, done: false }] } : f,
                ),
            };
            saveData(next);
            return next;
        });
    };

    const toggleWaypoint = (flightId: string, taskId: string) => {
        setData((d) => {
            const next = {
                ...d,
                flights: d.flights.map((f) =>
                    f.id === flightId
                        ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
                        : f,
                ),
            };
            saveData(next);
            return next;
        });
    };

    const deleteWaypoint = (flightId: string, taskId: string) => {
        setData((d) => {
            const next = {
                ...d,
                flights: d.flights.map((f) =>
                    f.id === flightId ? { ...f, tasks: f.tasks.filter((t) => t.id !== taskId) } : f,
                ),
            };
            saveData(next);
            return next;
        });
    };

    const editWaypoint = (flightId: string, taskId: string, text: string) => {
        setData((d) => {
            const next = {
                ...d,
                flights: d.flights.map((f) =>
                    f.id === flightId ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, text } : t)) } : f,
                ),
            };
            saveData(next);
            return next;
        });
    };

    const toggleWaypointExpedite = (flightId: string, taskId: string) => {
        setData((d) => {
            const next = {
                ...d,
                flights: d.flights.map((f) =>
                    f.id === flightId
                        ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, expedite: !t.expedite } : t)) }
                        : f,
                ),
            };
            saveData(next);
            return next;
        });
    };

    const value: FlightsContextValue = {
        data,
        loading,
        active: data.flights.filter((f) => !isDismissedToday(f)),
        done: data.flights.filter((f) => isDismissedToday(f)),
        notificationStatus,
        requestNotification,
        addFlight,
        deleteFlight,
        dismissFlight,
        undoDismiss,
        snoozeFlight,
        renameFlight,
        setNote,
        addWaypoint,
        toggleWaypoint,
        deleteWaypoint,
        editWaypoint,
        toggleWaypointExpedite,
    };

    return <FlightsContext.Provider value={value}>{children}</FlightsContext.Provider>;
};

export const useFlights = (): FlightsContextValue => {
    const context = useContext(FlightsContext);
    if (!context) throw new Error('useFlights must be used within a FlightsProvider');
    return context;
};
```

- [ ] **Step 2: Handle `loading` in `App.tsx`**

Open `apps/web/src/App.tsx`. Find where `FlightsProvider` renders its children and add a loading gate. The exact location depends on App.tsx structure — find the component that renders flight UI (likely the first thing inside `FlightsProvider`) and wrap it:

```typescript
// In whatever component consumes the context at the top level:
const { loading } = useFlights();
if (loading) return null;
```

Or, if App.tsx renders directly, add to the top of the main component body:

```typescript
const { loading } = useFlights();
if (loading) return null;
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors. Fix any type errors before committing.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/context/FlightsContext.tsx apps/web/src/App.tsx
git commit -m "Move to async backend storage — inline saves per action, loading state"
```

---

### Task 7: End-to-end smoke test

- [ ] **Step 1: Start the backend**

In one terminal, from `apps/api/`:

```bash
pnpm dev
```

Expected: Fastify server logs `Server listening at http://127.0.0.1:3001`

- [ ] **Step 2: Start the frontend**

In a second terminal, from `apps/web/`:

```bash
pnpm dev
```

Expected: Vite starts, no TypeScript errors.

- [ ] **Step 3: Verify end-to-end**

Open `http://localhost:5173` in a browser.

1. Add a flight — it should appear in the UI
2. Check `apps/api/data/appdata.json` exists and contains the flight
3. Reload the page — the flight should persist (loaded from the backend, not localStorage)
4. Add a waypoint, toggle it, rename the flight — each action should update `appdata.json`
5. Open DevTools → Network → filter by `/api` — confirm PUT requests fire on each action

- [ ] **Step 4: Final commit (if any cleanup)**

```bash
git add -p
git commit -m "Wire up backend storage end-to-end"
```
