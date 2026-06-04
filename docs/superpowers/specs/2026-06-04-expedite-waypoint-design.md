# Expedite Waypoint — Design Spec

**Date:** 2026-06-04

## Overview

Add a binary "Expedite" toggle to waypoints (tasks). An expedited waypoint floats above all regular incomplete waypoints everywhere it appears — in the expanded task list and in the collapsed strip preview. The visual treatment uses the existing bright green (`#4ade80`) to distinguish expedited items from the muted baseline (`#2a5c2a`).

---

## Data Model

**File:** `packages/types/src/index.ts`

Add an optional `expedite` field to `Task`:

```ts
export interface Task {
    id: string;
    text: string;
    done: boolean;
    expedite?: boolean;
}
```

`expedite` is optional so existing stored data requires no migration — `undefined` is treated as `false` everywhere.

---

## Context Operation

**File:** `apps/web/src/context/FlightsContext.tsx`

Add one new operation to `FlightsContextValue`:

```ts
toggleWaypointExpedite(flightId: string, taskId: string): void
```

Implementation: find the task, flip its `expedite` boolean, persist via `saveData()`. Exposed through `useFlights()`.

---

## Sorting

A shared sort function is used wherever tasks are rendered or inspected:

```
1. Expedited & incomplete  (expedite === true && !done)
2. Regular & incomplete    (!done)
3. Done                    (done)
```

Relative order within each group is preserved (stable sort). This function is defined once and imported in both `WaypointList` and `FlightStrip`.

---

## WaypointList UI

**File:** `apps/web/src/components/FlightStrip/WaypointList.tsx`

- Tasks sorted before rendering using the shared sort function
- New `IconFlag` SVG added to `icons.tsx` (consistent 14×14 style with existing icons)
- Flag button placed between the done-checkbox and the task text, always visible
    - **Active (expedited):** `#4ade80` (bright green)
    - **Inactive:** `#2a5c2a` (muted green)
- Expedited rows get a left border in `#4ade80` to provide a clear visual anchor at a glance

---

## FlightStrip Preview

**File:** `apps/web/src/components/FlightStrip/index.tsx`

- `nextWaypoint` computed from the sorted list instead of raw `flight.tasks.find((t) => !t.done)`
- If `nextWaypoint.expedite` is true, the preview line `→ task text` renders in `#4ade80` (bright green) instead of the current muted `#2a5c2a`, making expedited status immediately visible without expanding the strip

---

## Out of Scope

- Expedited done tasks have no special treatment — once done, expedite state is irrelevant visually
- No server sync changes (localStorage only)
- No sorting of done tasks by expedite status
