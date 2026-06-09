# Flight Strip Drag-to-Reorder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add drag-to-reorder to the airborne flight strip list using dnd-kit, persisting order to the backend via the existing `PUT /api/data` endpoint.

**Architecture:** Add `order?: number` to the `Flight` type; `FlightsContext` gains a `reorderFlights` action that writes sequential integers onto each active flight and calls `saveData`. In `App.tsx` the airborne section is wrapped with dnd-kit's `DndContext` + `SortableContext`. Each `FlightStrip` uses `useSortable` and renders a left-side `DragHandle`. A `DragOverlay` provides the ghost clone during drag.

**Tech Stack:** React 19, TypeScript, dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`), Tailwind CSS, Vite

---

## File Map

| Action     | Path                                                 | Responsibility                                                                    |
| ---------- | ---------------------------------------------------- | --------------------------------------------------------------------------------- |
| Modify     | `packages/types/src/index.ts`                        | Add `order?: number` to `Flight`                                                  |
| Modify     | `apps/web/src/context/FlightsContext.tsx`            | Add `reorderFlights` action; sort `active` by `order`                             |
| **Create** | `apps/web/src/components/FlightStrip/DragHandle.tsx` | Grip icon; receives `listeners`/`attributes` from `useSortable`                   |
| Modify     | `apps/web/src/components/FlightStrip/index.tsx`      | `useSortable` hook; drag state styling; `isDragOverlay` prop; render `DragHandle` |
| Modify     | `apps/web/src/App.tsx`                               | `DndContext` + `SortableContext` around airborne list; `DragOverlay` ghost        |

---

## Task 1: Install dnd-kit

**Files:**

- Modify: `apps/web/package.json` (via pnpm)

- [ ] **Step 1: Install packages**

```bash
cd /home/bbarnett/code/aloft/apps/web
pnpm add @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities
```

Expected: packages appear in `apps/web/package.json` under `dependencies`.

- [ ] **Step 2: Verify install**

```bash
ls node_modules/@dnd-kit
```

Expected output includes: `core  sortable  utilities`

- [ ] **Step 3: Commit**

```bash
git add apps/web/package.json apps/web/pnpm-lock.yaml pnpm-lock.yaml
git commit -m "Install dnd-kit for drag-to-reorder"
```

---

## Task 2: Add `order` field to Flight type

**Files:**

- Modify: `packages/types/src/index.ts`

- [ ] **Step 1: Add the field**

Edit `packages/types/src/index.ts`. Change the `Flight` interface from:

```ts
export interface Flight {
    id: string;
    callsign: string;
    name: string;
    tasks: Task[];
    note: string | null;
    dismissedOn: string | null;
    snoozedUntil: number | null;
}
```

To:

```ts
export interface Flight {
    id: string;
    callsign: string;
    name: string;
    tasks: Task[];
    note: string | null;
    dismissedOn: string | null;
    snoozedUntil: number | null;
    order?: number;
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/bbarnett/code/aloft/apps/web
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add packages/types/src/index.ts
git commit -m "Add order field to Flight type"
```

---

## Task 3: Add `reorderFlights` to FlightsContext and sort active

**Files:**

- Modify: `apps/web/src/context/FlightsContext.tsx`

- [ ] **Step 1: Add `reorderFlights` to the context interface**

In `FlightsContext.tsx`, find the `FlightsContextValue` interface (line 36) and add `reorderFlights` after `toggleWaypointExpedite`:

```ts
export interface FlightsContextValue {
    data: UserData;
    loading: boolean;
    user: UserProfile | null;
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
    reorderFlights: (orderedIds: string[]) => void;
}
```

- [ ] **Step 2: Implement `reorderFlights`**

After the `toggleWaypointExpedite` function (around line 271), add:

```ts
const reorderFlights = (orderedIds: string[]) => {
    const next = {
        ...data,
        flights: data.flights.map((f) => {
            const idx = orderedIds.indexOf(f.id);
            return idx !== -1 ? { ...f, order: idx } : f;
        }),
    };
    setData(next);
    saveData(next);
};
```

- [ ] **Step 3: Sort `active` by `order` and add `reorderFlights` to context value**

Find the `value` object near the bottom of `FlightsProvider` (around line 273). Replace:

```ts
const value: FlightsContextValue = {
    data,
    loading,
    user,
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
```

With:

```ts
const sortByOrder = (a: Flight, b: Flight): number => {
    if (a.order === undefined && b.order === undefined) return 0;
    if (a.order === undefined) return 1;
    if (b.order === undefined) return -1;
    return a.order - b.order;
};

const value: FlightsContextValue = {
    data,
    loading,
    user,
    active: data.flights.filter((f) => !isDismissedToday(f)).sort(sortByOrder),
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
    reorderFlights,
};
```

- [ ] **Step 4: Typecheck**

```bash
cd /home/bbarnett/code/aloft/apps/web
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/context/FlightsContext.tsx
git commit -m "Add reorderFlights action and order-based active sorting"
```

---

## Task 4: Create DragHandle component

**Files:**

- Create: `apps/web/src/components/FlightStrip/DragHandle.tsx`

- [ ] **Step 1: Create the file**

Create `apps/web/src/components/FlightStrip/DragHandle.tsx` with:

```tsx
import { useSortable } from '@dnd-kit/sortable';

type SortableReturn = ReturnType<typeof useSortable>;

interface Props {
    listeners: SortableReturn['listeners'];
    attributes: SortableReturn['attributes'];
}

const DragHandle = ({ listeners, attributes }: Props) => (
    <div
        {...listeners}
        {...attributes}
        style={{ cursor: 'grab', touchAction: 'none' }}
        className="text-[#2a5c2a] hover:text-[#4ade80] px-1 flex-shrink-0 select-none flex items-center self-stretch"
        onClick={(e) => e.stopPropagation()}
    >
        ⠿
    </div>
);

export default DragHandle;
```

- [ ] **Step 2: Typecheck**

```bash
cd /home/bbarnett/code/aloft/apps/web
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/FlightStrip/DragHandle.tsx
git commit -m "Add DragHandle component"
```

---

## Task 5: Update FlightStrip with useSortable and drag state

**Files:**

- Modify: `apps/web/src/components/FlightStrip/index.tsx`

This task rewrites the component's structure: a wrapper `<div>` replaces the `<>` fragment so dnd-kit can reference a single root node. The `mb-[3px]` spacing moves to the wrapper. The drag handle is inserted between the accent bar and callsign column.

- [ ] **Step 1: Add imports**

At the top of `apps/web/src/components/FlightStrip/index.tsx`, add to the existing imports:

```tsx
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import DragHandle from './DragHandle';
```

- [ ] **Step 2: Update the Props interface**

Change:

```tsx
interface Props {
    flight: Flight;
}
```

To:

```tsx
interface Props {
    flight: Flight;
    isDragOverlay?: boolean;
}
```

- [ ] **Step 3: Replace the full component body**

Replace the `FlightStrip` function signature and its entire `return` statement with the following. Everything between the hooks/state and the `return` stays the same — only the signature, the addition of `useSortable`, and the `return` JSX change.

New signature:

```tsx
const FlightStrip = ({ flight, isDragOverlay = false }: Props) => {
```

After the existing hooks and state (after line 20, `const [, forceUpdate] = useState(0);`), add:

```tsx
const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: flight.id,
});
```

Replace the entire `return (...)` block with:

```tsx
return (
    <div
        ref={isDragOverlay ? undefined : setNodeRef}
        style={{
            transform: isDragOverlay ? undefined : CSS.Transform.toString(transform),
            transition: isDragOverlay ? undefined : transition,
            opacity: isDragging && !isDragOverlay ? 0.3 : 1,
        }}
        className="mb-[3px]"
    >
        {/* Strip row */}
        <div
            className={clsx(
                'flex items-stretch border min-h-[52px] transition-colors cursor-pointer',
                isDragOverlay ? 'border-[#86efac] shadow-[0_8px_24px_rgba(0,0,0,0.8)]' : 'border-[#1d4d1d]',
            )}
            style={{ background: expanded ? 'rgba(0,22,0,0.85)' : 'rgba(0,16,0,0.7)' }}
            onClick={() => !editingName && !isDragOverlay && setExpanded((e) => !e)}
        >
            {/* Accent bar */}
            <div className="w-[5px] shrink-0 self-stretch" style={{ background: accentColor }} />

            {/* Drag handle — hidden on dismissed strips */}
            {!dismissed && <DragHandle listeners={listeners} attributes={attributes} />}

            {/* Callsign column */}
            <div
                className={clsx(
                    'w-[80px] shrink-0 flex flex-col items-center justify-center border-r border-[#1a3a1a] p-2 font-mono text-[11px] font-bold tracking-[1px] text-center leading-[1.4]',
                    dismissed ? 'text-[#1d4d1d]' : 'text-[#86efac]',
                )}
            >
                {flight.callsign}
                {snoozed && <span className="text-[9px] text-[#4ade80] block mt-[2px]">⏱ {snoozeLabel(flight)}</span>}
            </div>

            {/* Main column */}
            <div className="flex-1 flex flex-col justify-center py-2 px-3 border-r border-[#1a3a1a] min-w-0">
                {editingName ? (
                    <input
                        className="w-full bg-[rgba(0,8,0,0.6)] border border-[#2a5c2a] text-[#6ee77c] font-mono text-[14px] px-[6px] py-[1px] outline-none"
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
                        className="font-mono text-[14px] overflow-hidden text-ellipsis whitespace-nowrap"
                        style={{ color: nameColor }}
                    >
                        {flight.name}
                    </div>
                )}
                {expeditedWaypoints.length > 0
                    ? expeditedWaypoints.map((wp) => (
                          <div
                              key={wp.id}
                              className="font-mono text-[11px] mt-[2px] overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-[4px]"
                              style={{ color: '#4ade80' }}
                          >
                              <span className="truncate">→ {wp.text}</span>
                              <IconFlag />
                          </div>
                      ))
                    : nextWaypoint && (
                          <div
                              className="font-mono text-[11px] mt-[2px] overflow-hidden text-ellipsis whitespace-nowrap flex items-center gap-[4px]"
                              style={{ color: '#2a5c2a' }}
                          >
                              <span className="truncate">→ {nextWaypoint.text}</span>
                          </div>
                      )}
                {flight.note && !dismissed && (
                    <div className="font-mono text-[10px] text-[#2a5c2a] mt-[1px] overflow-hidden text-ellipsis whitespace-nowrap italic">
                        ⌁ {flight.note}
                    </div>
                )}
                {dismissed && (
                    <div className="font-mono text-[10px] text-[#1d4d1d] mt-[2px] whitespace-nowrap overflow-hidden text-ellipsis">
                        landed · returns tomorrow
                    </div>
                )}
            </div>

            {/* Right column */}
            <div className="w-[80px] sm:w-[90px] shrink-0 flex flex-col items-end justify-center p-2 pr-[10px] gap-1">
                <div className="font-mono text-[11px] text-[#2a5c2a]">
                    {doneTasks.length}/{flight.tasks.length} wpts
                </div>
                <div className="flex gap-[3px]" onClick={(e) => e.stopPropagation()}>
                    {!dismissed && (
                        <button
                            className="bg-transparent border-none cursor-pointer text-[#2a5c2a] p-[2px] flex items-center"
                            onClick={() => setEditingName(true)}
                            title="Rename"
                        >
                            <IconEdit />
                        </button>
                    )}
                    <button
                        className="bg-transparent border-none cursor-pointer text-[#2a5c2a] hover:text-[#4ade80] p-[2px] flex items-center"
                        onClick={() => deleteFlight(flight.id)}
                        title="Delete"
                    >
                        <IconTrash />
                    </button>
                </div>
            </div>
        </div>

        {/* Expanded panel — hidden while dragging */}
        {expanded && !isDragging && (
            <div className="border border-[#1d4d1d] border-t-0 bg-[rgba(0,10,0,0.85)]">
                <div className="p-3 pb-[14px] pl-[98px]">
                    <WaypointList flightId={flight.id} />

                    {/* Pilot note section */}
                    <div className="mt-[10px] border border-[#142814] bg-[rgba(0,8,0,0.5)] p-2 px-[10px]">
                        <div className="font-mono text-[9px] tracking-[2px] text-[#2a5c2a] mb-1">// PILOT NOTE</div>
                        {editingNote ? (
                            <textarea
                                className="bg-transparent border-none outline-none resize-none font-mono text-[12px] text-[#4ade80] w-full leading-[1.5] opacity-85"
                                rows={2}
                                value={noteVal}
                                autoFocus
                                onChange={(e) => setNoteVal(e.target.value)}
                                onBlur={commitNote}
                                onKeyDown={(e) => {
                                    if (e.key === 'Escape') e.currentTarget.blur();
                                }}
                            />
                        ) : (
                            <div
                                className={clsx(
                                    'font-mono text-[12px] leading-[1.5] cursor-text min-h-[18px]',
                                    flight.note ? 'text-[#4ade80] opacity-80' : 'text-[#1d4d1d] opacity-50',
                                )}
                                onClick={() => setEditingNote(true)}
                            >
                                {flight.note ?? 'click to add note...'}
                            </div>
                        )}
                    </div>

                    <FlightStripActions flightId={flight.id} />
                </div>
            </div>
        )}
    </div>
);
```

- [ ] **Step 4: Typecheck**

```bash
cd /home/bbarnett/code/aloft/apps/web
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/FlightStrip/index.tsx
git commit -m "Integrate useSortable and DragHandle into FlightStrip"
```

---

## Task 6: Wrap airborne section in DnD context in App.tsx

**Files:**

- Modify: `apps/web/src/App.tsx`

- [ ] **Step 1: Add dnd-kit imports**

Replace the existing import block at the top of `apps/web/src/App.tsx` with:

```tsx
import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, closestCenter, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import clsx from 'clsx';
import FlightStrip from './components/FlightStrip';
import { IconBell } from './components/FlightStrip/icons';
import { useFlights } from './hooks/useFlights';
```

- [ ] **Step 2: Add drag state, sensors, and handlers**

Inside the `App` component, after the existing `useState` declarations and `useFlights` destructuring, add:

```tsx
const [draggingId, setDraggingId] = useState<string | null>(null);
const { data, loading, user, active, done, notificationStatus, requestNotification, addFlight, reorderFlights } =
    useFlights();

const sensors = useSensors(
    useSensor(PointerSensor, {
        activationConstraint: { distance: 5 },
    }),
);

const activeIds = active.map((f) => f.id);
const draggingFlight = draggingId ? (active.find((f) => f.id === draggingId) ?? null) : null;

const handleDragStart = (event: DragStartEvent) => {
    setDraggingId(String(event.active.id));
};

const handleDragEnd = (event: DragEndEvent) => {
    const { active: dragActive, over } = event;
    setDraggingId(null);
    if (!over || dragActive.id === over.id) return;
    const oldIndex = activeIds.indexOf(String(dragActive.id));
    const newIndex = activeIds.indexOf(String(over.id));
    reorderFlights(arrayMove(activeIds, oldIndex, newIndex));
};
```

Note: the existing `useFlights` destructuring line must be replaced with the one above that also pulls in `reorderFlights`.

- [ ] **Step 3: Replace the airborne section JSX**

Find the airborne section comment (around line 87) and replace the entire block:

```tsx
{
    /* Airborne section */
}
{
    active.length > 0 && (
        <>
            <div className="text-[9px] tracking-[3px] text-[#2a5c2a] uppercase mt-5 mb-2">// AIRBORNE</div>
            <div className="border border-[#1a3d1a] bg-[rgba(0,12,0,0.4)] p-[3px]">
                {active.map((flight) => (
                    <FlightStrip key={flight.id} flight={flight} />
                ))}
            </div>
        </>
    );
}
```

With:

```tsx
{
    /* Airborne section */
}
{
    active.length > 0 && (
        <>
            <div className="text-[9px] tracking-[3px] text-[#2a5c2a] uppercase mt-5 mb-2">// AIRBORNE</div>
            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
            >
                <div className="border border-[#1a3d1a] bg-[rgba(0,12,0,0.4)] p-[3px]">
                    <SortableContext items={activeIds} strategy={verticalListSortingStrategy}>
                        {active.map((flight) => (
                            <FlightStrip key={flight.id} flight={flight} />
                        ))}
                    </SortableContext>
                </div>
                <DragOverlay>{draggingFlight && <FlightStrip flight={draggingFlight} isDragOverlay />}</DragOverlay>
            </DndContext>
        </>
    );
}
```

- [ ] **Step 4: Typecheck**

```bash
cd /home/bbarnett/code/aloft/apps/web
pnpm typecheck
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/App.tsx
git commit -m "Wrap airborne section with DndContext for drag-to-reorder"
```

---

## Task 7: Smoke test

**Files:** none

- [ ] **Step 1: Start the dev server**

In one terminal:

```bash
cd /home/bbarnett/code/aloft/apps/api && pnpm dev
```

In another:

```bash
cd /home/bbarnett/code/aloft/apps/web && pnpm dev
```

Open http://localhost:5173 and log in.

- [ ] **Step 2: Verify drag-to-reorder works on desktop**

1. Ensure at least 2 flights exist in the airborne section.
2. Hover over the ⠿ grip on the left of any strip — cursor should change to `grab`.
3. Click and drag the strip vertically — the original slot should dim, and a ghost clone with a bright green border should follow the cursor.
4. Release over a different position — the strip should snap to the new position with a smooth animation.
5. Refresh the page — the new order should persist (order is saved to the backend).

- [ ] **Step 3: Verify touch drag works**

Open browser DevTools → toggle device toolbar (mobile emulation). Repeat the drag test using touch simulation. The drag should activate after a 5px movement.

- [ ] **Step 4: Verify dismissed strips are not draggable**

Dismissed strips (in CLEARED TODAY) should have no ⠿ handle and behave as before.

- [ ] **Step 5: Verify new flights land at the bottom**

Add a new flight — it should appear at the bottom of the airborne list. After reordering existing flights and refreshing, the new flight should still be at the bottom.

- [ ] **Step 6: Final commit if any tweaks were made during smoke test**

```bash
git add -p
git commit -m "Fix smoke test issues from drag-to-reorder"
```
