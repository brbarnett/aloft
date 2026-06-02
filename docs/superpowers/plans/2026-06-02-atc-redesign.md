# ATC Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rename the "juggling balls" app into an ATC-themed TRACON board with retro phosphor-green styling, horizontal flight strip layout, sticky notes per concept, and waypoint-reset-on-dismiss behavior.

**Architecture:** All changes are renames and reshaping of existing code — `Ball` → `Flight`, `BallCard` → `FlightStrip` (horizontal strip layout), `BallsContext` → `FlightsContext`. The storage key (`aloft_v1`) and `Task` type are preserved for backward compatibility. A storage migration runs once on load to rename `balls` → `flights` and add `callsign`/`note` defaults to existing records.

**Tech Stack:** React 19, TypeScript, Vite 8, Tailwind CSS v4, Vitest (added), pnpm workspaces

---

## File Map

| Action | Path                                                         | Responsibility                                                                  |
| ------ | ------------------------------------------------------------ | ------------------------------------------------------------------------------- |
| Modify | `packages/types/src/index.ts`                                | Rename `Ball`→`Flight`, add `callsign`/`note`, rename `AppData.balls`→`flights` |
| Create | `apps/web/src/utils/callsign.ts`                             | `generateCallsign(name)` pure function                                          |
| Create | `apps/web/src/utils/callsign.test.ts`                        | Unit tests for callsign generation                                              |
| Create | `apps/web/src/utils/prune.ts`                                | `pruneCompletedWaypoints(flight)` pure function                                 |
| Create | `apps/web/src/utils/prune.test.ts`                           | Unit tests for waypoint pruning                                                 |
| Modify | `apps/web/src/utils/storage.ts`                              | Load/save `flights`, run one-time migration from `balls`                        |
| Create | `apps/web/src/context/FlightsContext.tsx`                    | All flight state + actions (was BallsContext)                                   |
| Create | `apps/web/src/hooks/useFlights.ts`                           | Re-export `useFlights` + helpers (was useBalls)                                 |
| Modify | `apps/web/src/types.ts`                                      | Re-export `Flight`, `Task`, `AppData`                                           |
| Create | `apps/web/src/components/FlightStrip/icons.tsx`              | Copy of existing icons (unchanged)                                              |
| Create | `apps/web/src/components/FlightStrip/WaypointList.tsx`       | Waypoint rows with checkboxes (was TaskList)                                    |
| Create | `apps/web/src/components/FlightStrip/FlightStripActions.tsx` | HOLD PATTERN / CLEAR TO LAND buttons (was BallCardActions)                      |
| Create | `apps/web/src/components/FlightStrip/index.tsx`              | Horizontal strip layout with expand/collapse (was BallCard)                     |
| Modify | `apps/web/src/index.css`                                     | Add retro CSS: scanlines, vignette, ATC color vars                              |
| Modify | `apps/web/src/App.tsx`                                       | TRACON board layout with rack sections                                          |
| Modify | `apps/web/src/main.tsx`                                      | Swap `BallsProvider` → `FlightsProvider`                                        |
| Delete | `apps/web/src/components/BallCard/`                          | Replaced by FlightStrip                                                         |
| Delete | `apps/web/src/context/BallsContext.tsx`                      | Replaced by FlightsContext                                                      |
| Delete | `apps/web/src/hooks/useBalls.ts`                             | Replaced by useFlights                                                          |

---

## Task 1: Add Vitest

**Files:**

- Modify: `apps/web/package.json`
- Modify: `apps/web/vite.config.ts`

- [ ] **Install Vitest**

```bash
cd apps/web && pnpm add -D vitest
```

- [ ] **Update `apps/web/vite.config.ts`**

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
    plugins: [tailwindcss(), react()],
    test: {
        environment: 'node',
    },
});
```

- [ ] **Add test script to `apps/web/package.json`**

```json
{
    "scripts": {
        "dev": "vite",
        "build": "tsc -b && vite build",
        "preview": "vite preview",
        "typecheck": "tsc -b",
        "test": "vitest run",
        "test:watch": "vitest"
    }
}
```

- [ ] **Verify Vitest runs**

```bash
cd apps/web && pnpm test
```

Expected: `No test files found` (exit 0 or a friendly message — not an error)

- [ ] **Commit**

```bash
git add apps/web/package.json apps/web/vite.config.ts apps/web/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "Add Vitest test runner"
```

---

## Task 2: Update Shared Types

**Files:**

- Modify: `packages/types/src/index.ts`

- [ ] **Replace the contents of `packages/types/src/index.ts`**

```ts
export interface Task {
    id: string;
    text: string;
    done: boolean;
}

export interface Flight {
    id: string;
    callsign: string;
    name: string;
    tasks: Task[];
    note: string | null;
    dismissedOn: string | null;
    snoozedUntil: number | null;
}

export interface AppData {
    flights: Flight[];
}
```

- [ ] **Verify types package still compiles**

```bash
cd packages/types && pnpm exec tsc --noEmit
```

Expected: no output (success)

- [ ] **Commit**

```bash
git add packages/types/src/index.ts
git commit -m "Rename Ball to Flight in shared types, add callsign and note fields"
```

---

## Task 3: Callsign Utility

**Files:**

- Create: `apps/web/src/utils/callsign.ts`
- Create: `apps/web/src/utils/callsign.test.ts`

- [ ] **Write the failing tests first — create `apps/web/src/utils/callsign.test.ts`**

```ts
import { describe, expect, it, vi } from 'vitest';
import { generateCallsign } from './callsign';

describe('generateCallsign', () => {
    it('matches format XXX-NN', () => {
        expect(generateCallsign('Q4 Strategy')).toMatch(/^[A-Z]{3}-\d{2}$/);
    });

    it('uses first letter of each word up to 3', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(generateCallsign('Alpha Beta Gamma')).toBe('ABG-01');
        vi.restoreAllMocks();
    });

    it('pads with X when fewer than 3 words', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(generateCallsign('Hiring Loop')).toBe('HLX-01');
        vi.restoreAllMocks();
    });

    it('pads with XX for a single word', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(generateCallsign('Infra')).toBe('IXX-01');
        vi.restoreAllMocks();
    });

    it('ignores words beyond the third', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0);
        expect(generateCallsign('Alpha Beta Gamma Delta')).toBe('ABG-01');
        vi.restoreAllMocks();
    });

    it('number ranges from 01 to 99', () => {
        vi.spyOn(Math, 'random').mockReturnValue(0.98);
        expect(generateCallsign('Test')).toMatch(/-99$/);
        vi.restoreAllMocks();
    });
});
```

- [ ] **Run to confirm they fail**

```bash
cd apps/web && pnpm test
```

Expected: FAIL — `Cannot find module './callsign'`

- [ ] **Implement `apps/web/src/utils/callsign.ts`**

```ts
export const generateCallsign = (name: string): string => {
    const words = name.trim().split(/\s+/);
    const letters = words.slice(0, 3).map((w) => w[0]?.toUpperCase() ?? 'X');
    while (letters.length < 3) letters.push('X');
    const code = letters.join('');
    const num = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    return `${code}-${num}`;
};
```

- [ ] **Run tests — all should pass**

```bash
cd apps/web && pnpm test
```

Expected: 6 tests pass

- [ ] **Commit**

```bash
git add apps/web/src/utils/callsign.ts apps/web/src/utils/callsign.test.ts
git commit -m "Add generateCallsign utility with tests"
```

---

## Task 4: Waypoint Prune Utility

**Files:**

- Create: `apps/web/src/utils/prune.ts`
- Create: `apps/web/src/utils/prune.test.ts`

- [ ] **Write the failing tests — create `apps/web/src/utils/prune.test.ts`**

```ts
import type { Flight } from '@aloft/types';
import { describe, expect, it } from 'vitest';
import { pruneCompletedWaypoints } from './prune';

const makeFlight = (tasks: { id: string; done: boolean }[]): Flight => ({
    id: '1',
    callsign: 'TST-01',
    name: 'Test',
    tasks: tasks.map((t) => ({ ...t, text: t.id })),
    note: null,
    dismissedOn: null,
    snoozedUntil: null,
});

describe('pruneCompletedWaypoints', () => {
    it('removes done tasks', () => {
        const flight = makeFlight([
            { id: 'a', done: true },
            { id: 'b', done: false },
        ]);
        expect(pruneCompletedWaypoints(flight).tasks).toHaveLength(1);
        expect(pruneCompletedWaypoints(flight).tasks[0].id).toBe('b');
    });

    it('keeps all tasks when none are done', () => {
        const flight = makeFlight([{ id: 'a', done: false }]);
        expect(pruneCompletedWaypoints(flight).tasks).toHaveLength(1);
    });

    it('returns empty tasks array when all are done', () => {
        const flight = makeFlight([{ id: 'a', done: true }]);
        expect(pruneCompletedWaypoints(flight).tasks).toHaveLength(0);
    });

    it('does not mutate the original flight', () => {
        const flight = makeFlight([{ id: 'a', done: true }]);
        pruneCompletedWaypoints(flight);
        expect(flight.tasks).toHaveLength(1);
    });
});
```

- [ ] **Run to confirm they fail**

```bash
cd apps/web && pnpm test
```

Expected: FAIL — `Cannot find module './prune'`

- [ ] **Implement `apps/web/src/utils/prune.ts`**

```ts
import type { Flight } from '@aloft/types';

export const pruneCompletedWaypoints = (flight: Flight): Flight => ({
    ...flight,
    tasks: flight.tasks.filter((t) => !t.done),
});
```

- [ ] **Run all tests — should pass**

```bash
cd apps/web && pnpm test
```

Expected: 10 tests pass (6 callsign + 4 prune)

- [ ] **Commit**

```bash
git add apps/web/src/utils/prune.ts apps/web/src/utils/prune.test.ts
git commit -m "Add pruneCompletedWaypoints utility with tests"
```

---

## Task 5: Update Storage

**Files:**

- Modify: `apps/web/src/utils/storage.ts`

- [ ] **Replace `apps/web/src/utils/storage.ts`**

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
        const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') || {};

        // One-time migration: rename balls → flights, add callsign/note defaults
        if (Array.isArray(raw.balls) && !raw.flights) {
            raw.flights = raw.balls.map((b: Record<string, unknown>) => ({
                ...b,
                callsign: (b.callsign as string | undefined) ?? 'XXX-00',
                note: (b.note as string | null | undefined) ?? null,
                snoozedUntil: (b.snoozedUntil as number | null | undefined) ?? null,
                dismissedOn: (b.dismissedOn as string | null | undefined) ?? null,
            }));
            delete raw.balls;
        }

        return {
            flights: (raw.flights ?? []).map((f: Record<string, unknown>) => ({
                ...f,
                callsign: (f.callsign as string | undefined) ?? 'XXX-00',
                note: (f.note as string | null | undefined) ?? null,
                snoozedUntil: (f.snoozedUntil as number | null | undefined) ?? null,
                dismissedOn: (f.dismissedOn as string | null | undefined) ?? null,
            })),
        };
    } catch {
        return { flights: [] };
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

- [ ] **Verify types compile (storage will still error until context is updated — that's fine)**

```bash
cd apps/web && pnpm exec tsc --noEmit 2>&1 | head -20
```

Expected: errors about `Ball`/`balls` references in BallsContext and App — those are fine, we haven't touched them yet.

- [ ] **Commit**

```bash
git add apps/web/src/utils/storage.ts
git commit -m "Update storage to use flights, add backward-compat migration from balls"
```

---

## Task 6: FlightsContext

**Files:**

- Create: `apps/web/src/context/FlightsContext.tsx`

- [ ] **Create `apps/web/src/context/FlightsContext.tsx`**

```tsx
import { createContext, useContext, useEffect, useState } from 'react';
import type { AppData, Flight } from '@aloft/types';
import { generateCallsign } from '../utils/callsign';
import { restoreSnoozedNotifications, scheduleWakeNotification } from '../utils/notifications';
import { pruneCompletedWaypoints } from '../utils/prune';
import { loadData, loadNotificationState, saveData, saveNotificationState } from '../utils/storage';

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
    active: Flight[];
    done: Flight[];
    notificationStatus: string;
    requestNotification: () => void;
    addFlight: (name: string) => void;
    deleteFlight: (id: string) => void;
    dismissFlight: (id: string) => void;
    undoDismiss: (id: string) => void;
    snoozeFlight: (id: string, ms: number | null) => void;
    renameFlight: (id: string, name: string) => void;
    setNote: (id: string, note: string | null) => void;
    addWaypoint: (flightId: string, text: string) => void;
    toggleWaypoint: (flightId: string, taskId: string) => void;
    deleteWaypoint: (flightId: string, taskId: string) => void;
    editWaypoint: (flightId: string, taskId: string, text: string) => void;
}

const FlightsContext = createContext<FlightsContextValue | null>(null);

export const FlightsProvider = ({ children }: { children: React.ReactNode }) => {
    const [data, setData] = useState<AppData>(loadData);
    const [notificationStatus, setNotificationStatus] = useState<string>(() => {
        try {
            return Notification.permission;
        } catch {
            return 'unsupported';
        }
    });

    useEffect(() => {
        saveData(data);
    }, [data]);

    useEffect(() => {
        restoreSnoozedNotifications(data.flights);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        setData((d) => ({
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
        }));
    };

    const deleteFlight = (id: string) => {
        setData((d) => ({ ...d, flights: d.flights.filter((f) => f.id !== id) }));
    };

    const dismissFlight = (id: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) =>
                f.id === id ? { ...pruneCompletedWaypoints(f), dismissedOn: getTodayStr() } : f,
            ),
        }));
    };

    const undoDismiss = (id: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) => (f.id === id ? { ...f, dismissedOn: null, snoozedUntil: null } : f)),
        }));
    };

    const snoozeFlight = (id: string, ms: number | null) => {
        const until =
            ms === null
                ? (() => {
                      const d = new Date();
                      d.setHours(24, 0, 0, 0);
                      return d.getTime();
                  })()
                : Date.now() + ms;
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) => (f.id === id ? { ...f, snoozedUntil: until, dismissedOn: null } : f)),
        }));
        scheduleWakeNotification({ snoozedUntil: until } as Flight);
    };

    const renameFlight = (id: string, name: string) => {
        setData((d) => ({ ...d, flights: d.flights.map((f) => (f.id === id ? { ...f, name } : f)) }));
    };

    const setNote = (id: string, note: string | null) => {
        setData((d) => ({ ...d, flights: d.flights.map((f) => (f.id === id ? { ...f, note } : f)) }));
    };

    const addWaypoint = (flightId: string, text: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) =>
                f.id === flightId ? { ...f, tasks: [...f.tasks, { id: newId(), text, done: false }] } : f,
            ),
        }));
    };

    const toggleWaypoint = (flightId: string, taskId: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) =>
                f.id === flightId
                    ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
                    : f,
            ),
        }));
    };

    const deleteWaypoint = (flightId: string, taskId: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) =>
                f.id === flightId ? { ...f, tasks: f.tasks.filter((t) => t.id !== taskId) } : f,
            ),
        }));
    };

    const editWaypoint = (flightId: string, taskId: string, text: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) =>
                f.id === flightId ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, text } : t)) } : f,
            ),
        }));
    };

    const value: FlightsContextValue = {
        data,
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
    };

    return <FlightsContext.Provider value={value}>{children}</FlightsContext.Provider>;
};

export const useFlights = (): FlightsContextValue => {
    const context = useContext(FlightsContext);
    if (!context) throw new Error('useFlights must be used within a FlightsProvider');
    return context;
};
```

- [ ] **Run tests — still 10 passing, no regression**

```bash
cd apps/web && pnpm test
```

- [ ] **Commit**

```bash
git add apps/web/src/context/FlightsContext.tsx
git commit -m "Add FlightsContext with dismissFlight waypoint pruning and setNote action"
```

---

## Task 7: useFlights Hook + types.ts

**Files:**

- Create: `apps/web/src/hooks/useFlights.ts`
- Modify: `apps/web/src/types.ts`

- [ ] **Create `apps/web/src/hooks/useFlights.ts`**

```ts
export { useFlights, isDismissedToday, isSnoozed, snoozeLabel } from '../context/FlightsContext';
```

- [ ] **Update `apps/web/src/types.ts`**

```ts
export type { Task, Flight, AppData } from '@aloft/types';
```

- [ ] **Commit**

```bash
git add apps/web/src/hooks/useFlights.ts apps/web/src/types.ts
git commit -m "Add useFlights hook and update types re-exports"
```

---

## Task 8: FlightStrip Icons

**Files:**

- Create: `apps/web/src/components/FlightStrip/icons.tsx`

- [ ] **Create `apps/web/src/components/FlightStrip/icons.tsx`** — exact copy of the existing BallCard icons:

```tsx
export const IconCheck = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
            d="M3 8l3.5 3.5L13 4.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const IconPlus = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

export const IconTrash = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
            d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);

export const IconSnooze = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 5.5v3l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M5.5 1.5l-2 2M10.5 1.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const IconBell = () => (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path
            d="M8 1.5A4.5 4.5 0 003.5 6v3.5L2 11h12l-1.5-1.5V6A4.5 4.5 0 008 1.5z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
        />
        <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5" />
    </svg>
);

export const IconUndo = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M3 7V3L1 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M3 5a6 6 0 106 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
);

export const IconEdit = () => (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
            d="M11 2l3 3-8 8H3v-3l8-8z"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </svg>
);
```

- [ ] **Commit**

```bash
git add apps/web/src/components/FlightStrip/icons.tsx
git commit -m "Add FlightStrip icons"
```

---

## Task 9: WaypointList Component

**Files:**

- Create: `apps/web/src/components/FlightStrip/WaypointList.tsx`

- [ ] **Create `apps/web/src/components/FlightStrip/WaypointList.tsx`**

```tsx
import { useState } from 'react';
import type { Task } from '@aloft/types';
import { useFlights } from '../../hooks/useFlights';
import { IconCheck, IconEdit, IconPlus, IconTrash } from './icons';

interface Props {
    flightId: string;
}

const S = {
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 0',
        borderBottom: '1px solid #0a160a',
    } as React.CSSProperties,
    checkbox: (done: boolean): React.CSSProperties => ({
        width: '13px',
        height: '13px',
        border: `1px solid ${done ? '#4ade80' : '#2a5c2a'}`,
        background: done ? 'rgba(74,222,128,0.1)' : 'transparent',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: done ? '#4ade80' : 'transparent',
        fontSize: '8px',
    }),
    text: (done: boolean): React.CSSProperties => ({
        fontFamily: "'Courier New', monospace",
        fontSize: '13px',
        flex: 1,
        color: done ? '#2a5c2a' : '#4ade80',
        textDecoration: done ? 'line-through' : 'none',
    }),
    iconBtn: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: '#2a5c2a',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
    } as React.CSSProperties,
    input: {
        background: 'rgba(0,8,0,0.6)',
        border: '1px solid #2a5c2a',
        color: '#4ade80',
        fontFamily: "'Courier New', monospace",
        fontSize: '13px',
        padding: '2px 6px',
        flex: 1,
        outline: 'none',
    } as React.CSSProperties,
    addRow: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' } as React.CSSProperties,
    addInput: {
        background: 'rgba(0,8,0,0.6)',
        border: '1px solid #1d4d1d',
        borderBottom: '1px solid #2a5c2a',
        color: '#4ade80',
        fontFamily: "'Courier New', monospace",
        fontSize: '12px',
        padding: '3px 6px',
        flex: 1,
        outline: 'none',
    } as React.CSSProperties,
};

const WaypointList = ({ flightId }: Props) => {
    const { data, addWaypoint, toggleWaypoint, deleteWaypoint, editWaypoint } = useFlights();
    const flight = data.flights.find((f) => f.id === flightId);

    const [input, setInput] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingVal, setEditingVal] = useState('');

    if (!flight) return null;

    const startEdit = (task: Task) => {
        setEditingId(task.id);
        setEditingVal(task.text);
    };

    const commitEdit = () => {
        const v = editingVal.trim();
        if (v && editingId) editWaypoint(flightId, editingId, v);
        setEditingId(null);
    };

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (input.trim()) {
            addWaypoint(flightId, input.trim());
            setInput('');
        }
    };

    return (
        <div>
            {flight.tasks.map((task) => (
                <div key={task.id} style={{ ...S.row, borderBottom: '1px solid #0a160a' }}>
                    <button style={S.checkbox(task.done)} onClick={() => toggleWaypoint(flightId, task.id)}>
                        {task.done && <IconCheck />}
                    </button>
                    {editingId === task.id ? (
                        <input
                            style={S.input}
                            value={editingVal}
                            autoFocus
                            onChange={(e) => setEditingVal(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit();
                                if (e.key === 'Escape') setEditingId(null);
                            }}
                        />
                    ) : (
                        <span style={S.text(task.done)} onDoubleClick={() => !task.done && startEdit(task)}>
                            {task.text}
                        </span>
                    )}
                    {editingId !== task.id && (
                        <>
                            {!task.done && (
                                <button style={S.iconBtn} onClick={() => startEdit(task)} title="Edit">
                                    <IconEdit />
                                </button>
                            )}
                            <button
                                style={{ ...S.iconBtn, color: '#3a1a1a' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#3a1a1a')}
                                onClick={() => deleteWaypoint(flightId, task.id)}
                            >
                                <IconTrash />
                            </button>
                        </>
                    )}
                </div>
            ))}
            <form style={S.addRow} onSubmit={handleAdd}>
                <input
                    style={S.addInput}
                    placeholder="+ ADD WAYPOINT..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button
                    type="submit"
                    style={{ ...S.iconBtn, color: input.trim() ? '#4ade80' : '#1d4d1d' }}
                    disabled={!input.trim()}
                >
                    <IconPlus />
                </button>
            </form>
        </div>
    );
};

export default WaypointList;
```

- [ ] **Commit**

```bash
git add apps/web/src/components/FlightStrip/WaypointList.tsx
git commit -m "Add WaypointList component"
```

---

## Task 10: FlightStripActions Component

**Files:**

- Create: `apps/web/src/components/FlightStrip/FlightStripActions.tsx`

- [ ] **Create `apps/web/src/components/FlightStrip/FlightStripActions.tsx`**

```tsx
import { useState } from 'react';
import { isDismissedToday, isSnoozed, snoozeLabel, useFlights } from '../../hooks/useFlights';
import { IconBell, IconUndo } from './icons';

const HOLD_OPTIONS: { label: string; ms: number | null }[] = [
    { label: '20 MIN', ms: 20 * 60 * 1000 },
    { label: '1 HR', ms: 60 * 60 * 1000 },
    { label: '2 HR', ms: 2 * 60 * 60 * 1000 },
    { label: 'TOMORROW', ms: null },
];

const btn: React.CSSProperties = {
    fontFamily: "'Courier New', monospace",
    fontSize: '10px',
    letterSpacing: '1px',
    padding: '5px 12px',
    cursor: 'pointer',
    textTransform: 'uppercase',
    background: 'transparent',
    border: '1px solid #1d4d1d',
    color: '#4ade80',
};

interface Props {
    flightId: string;
}

const FlightStripActions = ({ flightId }: Props) => {
    const { data, dismissFlight, undoDismiss, snoozeFlight } = useFlights();
    const flight = data.flights.find((f) => f.id === flightId);
    const [showHold, setShowHold] = useState(false);

    if (!flight) return null;

    const dismissed = isDismissedToday(flight);
    const snoozed = isSnoozed(flight);

    return (
        <div style={{ marginTop: '10px' }}>
            {!dismissed && (
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                    <div style={{ position: 'relative' }}>
                        <button
                            style={{ ...btn, borderColor: '#2a5c2a', color: '#2a7a2a' }}
                            onClick={() => setShowHold((v) => !v)}
                        >
                            <IconBell /> ⏱ HOLD PATTERN
                        </button>
                        {showHold && (
                            <div
                                style={{
                                    position: 'absolute',
                                    top: 'calc(100% + 4px)',
                                    left: 0,
                                    background: '#060e06',
                                    border: '1px solid #1d4d1d',
                                    zIndex: 100,
                                    minWidth: '110px',
                                }}
                            >
                                {HOLD_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.label}
                                        style={{
                                            display: 'block',
                                            width: '100%',
                                            background: 'transparent',
                                            border: 'none',
                                            fontFamily: "'Courier New', monospace",
                                            fontSize: '10px',
                                            color: '#4ade80',
                                            padding: '6px 12px',
                                            textAlign: 'left',
                                            cursor: 'pointer',
                                            letterSpacing: '1px',
                                        }}
                                        onClick={() => {
                                            snoozeFlight(flightId, opt.ms);
                                            setShowHold(false);
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                    <button style={{ ...btn, borderColor: '#4ade80' }} onClick={() => dismissFlight(flightId)}>
                        ✈ CLEAR TO LAND
                    </button>
                </div>
            )}

            {snoozed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                        style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: '10px',
                            color: '#2a5c2a',
                            letterSpacing: '1px',
                        }}
                    >
                        HOLDING FOR {snoozeLabel(flight)}
                    </span>
                    <button style={{ ...btn, fontSize: '9px' }} onClick={() => undoDismiss(flightId)}>
                        <IconUndo /> RESUME
                    </button>
                </div>
            )}

            {dismissed && !snoozed && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span
                        style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: '10px',
                            color: '#1d4d1d',
                            letterSpacing: '1px',
                        }}
                    >
                        CLEARED — RETURNS TOMORROW
                    </span>
                    <button style={{ ...btn, fontSize: '9px' }} onClick={() => undoDismiss(flightId)}>
                        <IconUndo /> RECALL
                    </button>
                </div>
            )}
        </div>
    );
};

export default FlightStripActions;
```

- [ ] **Commit**

```bash
git add apps/web/src/components/FlightStrip/FlightStripActions.tsx
git commit -m "Add FlightStripActions with HOLD PATTERN and CLEAR TO LAND"
```

---

## Task 11: FlightStrip Component

**Files:**

- Create: `apps/web/src/components/FlightStrip/index.tsx`

The strip layout has four columns: `[5px accent][80px callsign][flex main][90px right]`. The expanded panel uses `paddingLeft: 98px` (5 + 80 + 1 border + 12 padding) so waypoints indent flush with the main column.

- [ ] **Create `apps/web/src/components/FlightStrip/index.tsx`**

```tsx
import { useEffect, useState } from 'react';
import type { Flight } from '@aloft/types';
import { isDismissedToday, isSnoozed, snoozeLabel, useFlights } from '../../hooks/useFlights';
import FlightStripActions from './FlightStripActions';
import WaypointList from './WaypointList';
import { IconEdit, IconTrash } from './icons';

interface Props {
    flight: Flight;
}

const FlightStrip = ({ flight }: Props) => {
    const { renameFlight, deleteFlight, setNote } = useFlights();
    const [expanded, setExpanded] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameVal, setNameVal] = useState(flight.name);
    const [editingNote, setEditingNote] = useState(false);
    const [noteVal, setNoteVal] = useState(flight.note ?? '');
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const t = setInterval(() => forceUpdate((n) => n + 1), 30_000);
        return () => clearInterval(t);
    }, []);

    const dismissed = isDismissedToday(flight);
    const snoozed = isSnoozed(flight);
    const doneTasks = flight.tasks.filter((t) => t.done);
    const nextWaypoint = flight.tasks.find((t) => !t.done);

    const accentColor = snoozed ? '#7c3aed' : dismissed ? '#1d4d1d' : '#4ade80';
    const nameColor = dismissed ? '#1d4d1d' : '#6ee77c';
    const dimColor = '#2a5c2a';

    const commitRename = () => {
        const v = nameVal.trim();
        if (v && v !== flight.name) renameFlight(flight.id, v);
        else setNameVal(flight.name);
        setEditingName(false);
    };

    const commitNote = () => {
        const v = noteVal.trim() || null;
        setNote(flight.id, v);
        setEditingNote(false);
    };

    const stripStyle: React.CSSProperties = {
        display: 'flex',
        alignItems: 'stretch',
        border: '1px solid #1d4d1d',
        background: expanded ? 'rgba(0,22,0,0.85)' : 'rgba(0,16,0,0.7)',
        marginBottom: expanded ? 0 : '3px',
        cursor: dismissed ? 'default' : 'pointer',
        transition: 'background 0.1s',
        minHeight: '52px',
    };

    return (
        <>
            <div style={stripStyle} onClick={() => !dismissed && !editingName && setExpanded((e) => !e)}>
                {/* Accent bar */}
                <div style={{ width: '5px', flexShrink: 0, background: accentColor, alignSelf: 'stretch' }} />

                {/* Callsign column */}
                <div
                    style={{
                        width: '80px',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderRight: '1px solid #1a3a1a',
                        padding: '8px',
                        fontFamily: "'Courier New', monospace",
                        fontSize: '11px',
                        color: dismissed ? '#1d4d1d' : '#86efac',
                        fontWeight: 'bold',
                        letterSpacing: '1px',
                        textAlign: 'center',
                        lineHeight: 1.4,
                    }}
                >
                    {flight.callsign}
                    {snoozed && (
                        <span style={{ fontSize: '9px', color: '#7c3aed', display: 'block', marginTop: '2px' }}>
                            ⏱ {snoozeLabel(flight)}
                        </span>
                    )}
                </div>

                {/* Main column */}
                <div
                    style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center',
                        padding: '8px 12px',
                        borderRight: '1px solid #1a3a1a',
                        minWidth: 0,
                    }}
                >
                    {editingName ? (
                        <input
                            style={{
                                background: 'rgba(0,8,0,0.6)',
                                border: '1px solid #2a5c2a',
                                color: '#6ee77c',
                                fontFamily: "'Courier New', monospace",
                                fontSize: '14px',
                                padding: '1px 6px',
                                outline: 'none',
                                width: '100%',
                            }}
                            value={nameVal}
                            autoFocus
                            onChange={(e) => setNameVal(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename();
                                if (e.key === 'Escape') {
                                    setNameVal(flight.name);
                                    setEditingName(false);
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div
                            style={{
                                fontFamily: "'Courier New', monospace",
                                fontSize: '14px',
                                color: nameColor,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {flight.name}
                        </div>
                    )}
                    {!dismissed && nextWaypoint && (
                        <div
                            style={{
                                fontFamily: "'Courier New', monospace",
                                fontSize: '11px',
                                color: dimColor,
                                marginTop: '2px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            → {nextWaypoint.text}
                        </div>
                    )}
                    {!dismissed && flight.note && (
                        <div
                            style={{
                                fontFamily: "'Courier New', monospace",
                                fontSize: '10px',
                                color: dimColor,
                                marginTop: '1px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontStyle: 'italic',
                            }}
                        >
                            ⌁ {flight.note}
                        </div>
                    )}
                    {dismissed && (
                        <div
                            style={{
                                fontFamily: "'Courier New', monospace",
                                fontSize: '10px',
                                color: '#1d4d1d',
                                marginTop: '2px',
                            }}
                        >
                            landed · returns tomorrow
                        </div>
                    )}
                </div>

                {/* Right column */}
                <div
                    style={{
                        width: '90px',
                        flexShrink: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                        padding: '8px 10px',
                        gap: '4px',
                    }}
                >
                    {flight.tasks.length > 0 && (
                        <div style={{ fontFamily: "'Courier New', monospace", fontSize: '11px', color: dimColor }}>
                            {doneTasks.length}/{flight.tasks.length} wpts
                        </div>
                    )}
                    <div style={{ display: 'flex', gap: '3px' }} onClick={(e) => e.stopPropagation()}>
                        {!dismissed && (
                            <button
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    color: dimColor,
                                    padding: '2px',
                                    display: 'flex',
                                    alignItems: 'center',
                                }}
                                onClick={() => {
                                    setEditingName(true);
                                    setExpanded(true);
                                }}
                                title="Rename"
                            >
                                <IconEdit />
                            </button>
                        )}
                        <button
                            style={{
                                background: 'transparent',
                                border: 'none',
                                cursor: 'pointer',
                                color: '#2a1a1a',
                                padding: '2px',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                            onMouseLeave={(e) => (e.currentTarget.style.color = '#2a1a1a')}
                            onClick={() => deleteFlight(flight.id)}
                            title="Delete"
                        >
                            <IconTrash />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded panel */}
            {expanded && !dismissed && (
                <div
                    style={{
                        border: '1px solid #1d4d1d',
                        borderTop: 'none',
                        background: 'rgba(0,10,0,0.85)',
                        marginBottom: '3px',
                    }}
                >
                    <div style={{ paddingLeft: '98px', padding: '12px 14px 14px 98px' }}>
                        <WaypointList flightId={flight.id} />

                        {/* Pilot note */}
                        <div
                            style={{
                                marginTop: '10px',
                                border: '1px solid #142814',
                                background: 'rgba(0,8,0,0.5)',
                                padding: '8px 10px',
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: "'Courier New', monospace",
                                    fontSize: '9px',
                                    letterSpacing: '2px',
                                    color: dimColor,
                                    marginBottom: '4px',
                                }}
                            >
                                // PILOT NOTE
                            </div>
                            {editingNote ? (
                                <textarea
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        resize: 'none',
                                        fontFamily: "'Courier New', monospace",
                                        fontSize: '12px',
                                        color: '#4ade80',
                                        width: '100%',
                                        lineHeight: 1.5,
                                        opacity: 0.85,
                                    }}
                                    rows={2}
                                    value={noteVal}
                                    autoFocus
                                    onChange={(e) => setNoteVal(e.target.value)}
                                    onBlur={commitNote}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') {
                                            setNoteVal(flight.note ?? '');
                                            setEditingNote(false);
                                        }
                                    }}
                                />
                            ) : (
                                <div
                                    style={{
                                        fontFamily: "'Courier New', monospace",
                                        fontSize: '12px',
                                        color: flight.note ? '#4ade80' : '#1d4d1d',
                                        lineHeight: 1.5,
                                        opacity: flight.note ? 0.8 : 0.5,
                                        cursor: 'text',
                                        minHeight: '18px',
                                    }}
                                    onClick={() => {
                                        setNoteVal(flight.note ?? '');
                                        setEditingNote(true);
                                    }}
                                >
                                    {flight.note ?? 'click to add note...'}
                                </div>
                            )}
                        </div>

                        <FlightStripActions flightId={flight.id} />
                    </div>
                </div>
            )}
        </>
    );
};

export default FlightStrip;
```

- [ ] **Commit**

```bash
git add apps/web/src/components/FlightStrip/index.tsx
git commit -m "Add FlightStrip component with strip rack layout, note editing, expand/collapse"
```

---

## Task 12: Retro CSS + App.tsx

**Files:**

- Modify: `apps/web/src/index.css`
- Modify: `apps/web/src/App.tsx`

- [ ] **Update `apps/web/src/index.css`** — replace the full contents:

```css
@import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');
@import 'tailwindcss';

@theme {
    --font-sans: 'DM Sans', sans-serif;
    --font-mono: 'DM Mono', monospace;
}

.atc-scanlines {
    background: repeating-linear-gradient(
        0deg,
        transparent,
        transparent 3px,
        rgba(0, 0, 0, 0.07) 3px,
        rgba(0, 0, 0, 0.07) 4px
    );
    pointer-events: none;
    position: absolute;
    inset: 0;
    z-index: 5;
}

.atc-vignette {
    background: radial-gradient(ellipse at center, transparent 65%, rgba(0, 0, 0, 0.45) 100%);
    pointer-events: none;
    position: absolute;
    inset: 0;
    z-index: 4;
}
```

- [ ] **Replace `apps/web/src/App.tsx`**

```tsx
import { useState } from 'react';
import FlightStrip from './components/FlightStrip';
import { useFlights } from './hooks/useFlights';

const App = () => {
    const [newName, setNewName] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const { data, active, done, notificationStatus, requestNotification, addFlight } = useFlights();

    const handleAdd = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        addFlight(newName.trim());
        setNewName('');
        setShowAdd(false);
    };

    const now = new Date();
    const dateStr = now
        .toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })
        .toUpperCase()
        .replace(',', '');

    const headerStyle: React.CSSProperties = {
        fontFamily: "'Courier New', monospace",
        background: '#060e06',
        color: '#4ade80',
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
    };

    const innerStyle: React.CSSProperties = {
        position: 'relative',
        zIndex: 6,
        maxWidth: '680px',
        margin: '0 auto',
        padding: '24px 24px 60px',
    };

    const sectionLabel: React.CSSProperties = {
        fontFamily: "'Courier New', monospace",
        fontSize: '9px',
        letterSpacing: '3px',
        color: '#2a5c2a',
        textTransform: 'uppercase',
        margin: '20px 0 8px',
    };

    const rack: React.CSSProperties = {
        border: '1px solid #1a3d1a',
        background: 'rgba(0,12,0,0.4)',
        padding: '3px',
    };

    return (
        <div style={headerStyle}>
            <div className="atc-scanlines" />
            <div className="atc-vignette" />
            <div style={innerStyle}>
                {/* Header */}
                <div
                    style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'baseline',
                        borderBottom: '1px solid #1a3d1a',
                        paddingBottom: '14px',
                        marginBottom: '4px',
                    }}
                >
                    <div
                        style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: '20px',
                            color: '#6ee77c',
                            letterSpacing: '5px',
                        }}
                    >
                        ALOFT TRACON
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        <span
                            style={{
                                fontFamily: "'Courier New', monospace",
                                fontSize: '11px',
                                color: '#2a5c2a',
                                letterSpacing: '1px',
                            }}
                        >
                            {dateStr} &nbsp;·&nbsp; <span style={{ color: '#4ade80' }}>{active.length}</span> AIRBORNE
                            &nbsp;·&nbsp; <span style={{ color: '#4ade80' }}>{done.length}</span> CLEARED
                        </span>
                        {notificationStatus !== 'unsupported' && (
                            <button
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #1d4d1d',
                                    fontFamily: "'Courier New', monospace",
                                    fontSize: '9px',
                                    letterSpacing: '1px',
                                    padding: '3px 8px',
                                    cursor: 'pointer',
                                    color: notificationStatus === 'granted' ? '#4ade80' : '#2a5c2a',
                                    textTransform: 'uppercase',
                                }}
                                onClick={requestNotification}
                                title="Enable notifications"
                            >
                                {notificationStatus === 'granted' ? '🔔 ON' : 'NOTIFY'}
                            </button>
                        )}
                    </div>
                </div>

                {/* All cleared banner */}
                {done.length > 0 && done.length === data.flights.length && (
                    <div
                        style={{
                            border: '1px solid #1a3d1a',
                            background: 'rgba(0,20,0,0.5)',
                            padding: '8px 14px',
                            marginTop: '12px',
                            fontFamily: "'Courier New', monospace",
                            fontSize: '11px',
                            color: '#2a7a2a',
                            letterSpacing: '1px',
                            textAlign: 'center',
                        }}
                    >
                        ✓ ALL FLIGHTS CLEARED FOR TODAY
                    </div>
                )}

                {/* Airborne section */}
                {active.length > 0 && (
                    <>
                        <div style={sectionLabel}>// AIRBORNE</div>
                        <div style={rack}>
                            {active.map((flight) => (
                                <FlightStrip key={flight.id} flight={flight} />
                            ))}
                        </div>
                    </>
                )}

                {/* Cleared section */}
                {done.length > 0 && (
                    <>
                        <div style={sectionLabel}>// CLEARED TODAY</div>
                        <div style={rack}>
                            {done.map((flight) => (
                                <FlightStrip key={flight.id} flight={flight} />
                            ))}
                        </div>
                    </>
                )}

                {/* Empty state */}
                {data.flights.length === 0 && (
                    <div
                        style={{
                            fontFamily: "'Courier New', monospace",
                            fontSize: '11px',
                            color: '#1d4d1d',
                            letterSpacing: '2px',
                            textAlign: 'center',
                            padding: '40px 0',
                        }}
                    >
                        NO ACTIVE FLIGHTS — SQUAWK A NEW ONE BELOW
                    </div>
                )}

                {/* Add flight */}
                <div style={{ marginTop: '16px' }}>
                    {showAdd ? (
                        <form style={{ display: 'flex', gap: '8px' }} onSubmit={handleAdd}>
                            <input
                                style={{
                                    background: 'rgba(0,8,0,0.6)',
                                    border: '1px solid #2a5c2a',
                                    color: '#6ee77c',
                                    fontFamily: "'Courier New', monospace",
                                    fontSize: '14px',
                                    padding: '8px 12px',
                                    flex: 1,
                                    outline: 'none',
                                }}
                                placeholder="FLIGHT NAME..."
                                value={newName}
                                autoFocus
                                onChange={(e) => setNewName(e.target.value)}
                            />
                            <button
                                type="button"
                                style={{
                                    background: 'transparent',
                                    border: '1px solid #1d4d1d',
                                    color: '#2a5c2a',
                                    fontFamily: "'Courier New', monospace",
                                    fontSize: '11px',
                                    padding: '8px 14px',
                                    cursor: 'pointer',
                                    letterSpacing: '1px',
                                }}
                                onClick={() => {
                                    setShowAdd(false);
                                    setNewName('');
                                }}
                            >
                                CANCEL
                            </button>
                            <button
                                type="submit"
                                style={{
                                    background: newName.trim() ? 'rgba(74,222,128,0.1)' : 'transparent',
                                    border: `1px solid ${newName.trim() ? '#4ade80' : '#1d4d1d'}`,
                                    color: newName.trim() ? '#4ade80' : '#1d4d1d',
                                    fontFamily: "'Courier New', monospace",
                                    fontSize: '11px',
                                    padding: '8px 14px',
                                    cursor: newName.trim() ? 'pointer' : 'default',
                                    letterSpacing: '1px',
                                    textTransform: 'uppercase',
                                }}
                                disabled={!newName.trim()}
                            >
                                SQUAWK
                            </button>
                        </form>
                    ) : (
                        <button
                            style={{
                                background: 'transparent',
                                border: '1px dashed #1a3d1a',
                                color: '#1d5c1d',
                                fontFamily: "'Courier New', monospace",
                                fontSize: '11px',
                                padding: '10px 16px',
                                cursor: 'pointer',
                                letterSpacing: '1px',
                                width: '100%',
                                textAlign: 'left',
                            }}
                            onClick={() => setShowAdd(true)}
                        >
                            + SQUAWK NEW FLIGHT
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
```

- [ ] **Commit**

```bash
git add apps/web/src/index.css apps/web/src/App.tsx
git commit -m "Add retro TRACON board layout and ATC CSS effects"
```

---

## Task 13: Wire Up Provider + Clean Up

**Files:**

- Modify: `apps/web/src/main.tsx`
- Delete: `apps/web/src/context/BallsContext.tsx`
- Delete: `apps/web/src/hooks/useBalls.ts`
- Delete: `apps/web/src/components/BallCard/` (entire directory)

- [ ] **Update `apps/web/src/main.tsx`**

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { FlightsProvider } from './context/FlightsContext';
import './index.css';
import { registerServiceWorker } from './utils/notifications';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <FlightsProvider>
            <App />
        </FlightsProvider>
    </StrictMode>,
);
```

- [ ] **Delete old files**

```bash
rm apps/web/src/context/BallsContext.tsx
rm apps/web/src/hooks/useBalls.ts
rm -rf apps/web/src/components/BallCard
```

- [ ] **Verify full typecheck passes**

```bash
cd apps/web && pnpm typecheck
```

Expected: no errors

- [ ] **Run tests — all 10 still pass**

```bash
cd apps/web && pnpm test
```

Expected: 10 tests pass

- [ ] **Verify dev build starts**

```bash
cd apps/web && pnpm dev
```

Expected: Vite starts on localhost:5173, no console errors

- [ ] **Commit**

```bash
git add apps/web/src/main.tsx
git rm apps/web/src/context/BallsContext.tsx apps/web/src/hooks/useBalls.ts
git rm -r apps/web/src/components/BallCard
git commit -m "Wire FlightsProvider, remove old Ball components and context"
```

---

## Self-Review

**Spec coverage check:**

| Requirement                                              | Task                                    |
| -------------------------------------------------------- | --------------------------------------- |
| Ball → Flight rename (types, context, hooks, components) | Tasks 2, 5, 6, 7                        |
| Auto-generated callsign on addFlight                     | Tasks 3, 5                              |
| Sticky note per flight (setNote, click-to-edit)          | Tasks 5, 11                             |
| Waypoints reset on dismissFlight (done tasks pruned)     | Tasks 4, 5                              |
| Snooze does NOT prune                                    | Task 5 (snoozeFlight has no prune call) |
| Strip rack layout                                        | Task 11                                 |
| Retro phosphor green TRACON aesthetic                    | Tasks 12                                |
| `// AIRBORNE` / `// CLEARED TODAY` section labels        | Task 12                                 |
| `⏱ HOLD PATTERN` / `✈ CLEAR TO LAND` buttons             | Task 10                                 |
| Note preview in collapsed strip                          | Task 11                                 |
| Next waypoint hint in collapsed strip                    | Task 11                                 |
| Cleared strips non-expandable                            | Task 11 (dismissed check in onClick)    |
| Storage migration balls → flights                        | Task 5                                  |
| Notification copy updated                                | Task 6                                  |
