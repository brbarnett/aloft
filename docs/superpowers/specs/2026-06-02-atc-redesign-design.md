# Aloft — ATC Redesign

**Date:** 2026-06-02  
**Status:** Approved

## Overview

Transform the "juggling balls" concept into an ATC (Air Traffic Control) themed daily focus tracker. The core mechanic is unchanged — recurring concepts with next steps that can be dismissed for the day and return tomorrow — but everything gets renamed, reshaped, and restyled to match a retro TRACON aesthetic. The primary new feature is a persistent sticky note per concept and a waypoint-reset behavior on overnight return.

## What's Changing

Everything is a rename or reshaping of existing code. No new external dependencies. The storage key is preserved (`aloft-data`) so existing user data survives the migration.

| Before | After |
|--------|-------|
| Ball | Flight |
| Task | Waypoint (type stays `Task` in storage for compatibility) |
| BallCard | FlightStrip |
| BallsContext | FlightsContext |
| useBalls | useFlights |
| TaskList | WaypointList |
| BallCardActions | FlightStripActions |
| "in the air" | `// AIRBORNE` |
| "done today" | `// CLEARED TODAY` |
| dismiss | clear to land |
| snooze | hold pattern |
| Add ball | Squawk new flight |

## Data Model

Defined in `packages/types/src/index.ts`:

```ts
export interface Task {
  id: string
  text: string
  done: boolean
}

export interface Flight {
  id: string
  callsign: string       // auto-generated on creation, stored permanently
  name: string
  tasks: Task[]          // called "waypoints" in the UI
  note: string | null    // sticky pilot note, persists across days
  dismissedOn: string | null
  snoozedUntil: number | null
}

export interface AppData {
  flights: Flight[]
}
```

`Task` keeps its name internally for storage compatibility. The UI calls them waypoints.

## Callsign Generation

On `addFlight`, a callsign is auto-generated from the flight name and stored permanently on the flight record. It is never regenerated.

Algorithm (`utils/callsign.ts`):
1. Split the name on whitespace, take the first letter of each word, uppercase, take up to 3 chars. Pad with `X` if fewer than 3 words. e.g. "Q4 Strategy" → `QST`, "Hiring Loop" → `HLX`, "Infra" → `IXX`.
2. Append a dash and a zero-padded random number 01–99. e.g. `QST-04`, `HLX-12`.

## Waypoint Reset Behavior

When a flight is cleared to land (`dismissFlight`), the action prunes all `done: true` waypoints from the flight before saving `dismissedOn`. Unchecked waypoints carry forward to the next day.

Snooze (`snoozeFlight`) does not prune waypoints — the flight returns in a few hours with its full state intact.

## Visual Theme

**Palette:**
- Background: `#060e06`
- Active text / elements: `#6ee77c`, `#4ade80`
- Dim text / borders: `#2a5c2a`, `#1d4d1d`
- Glowing active blip: `box-shadow: 0 0 9px #4ade80`

**Typography:** `'Courier New', monospace` throughout.

**Atmospheric effects:**
- Scanlines: `repeating-linear-gradient`, ~7% opacity
- Vignette: radial gradient, 45% edge darkening

**Strip accent bar:** 5px left edge — `#4ade80` (active), `#1d4d1d` (cleared).

**Section labels:** `// AIRBORNE` and `// CLEARED TODAY`, 9px, `letter-spacing: 3px`.

**Action buttons:** transparent background, `1px solid` border, ALL CAPS monospace. Primary pair: `⏱ HOLD PATTERN` and `✈ CLEAR TO LAND`.

## Layout

### TRACON Board (App.tsx)

```
┌─────────────────────────────────────────────┐
│ ALOFT TRACON          MON 02JUN · 2 AIRBORNE │  ← header
├─────────────────────────────────────────────┤
│ // AIRBORNE                                  │  ← section label
│ ┌─ rack ────────────────────────────────── ┐ │
│ │ [acc][callsign][name / next / note peek][pr]│  ← strip (collapsed)
│ │ [acc][callsign][name / next / note peek][pr]│
│ │  └─ expanded: waypoints + note + actions  │ │
│ └───────────────────────────────────────── ┘ │
│                                               │
│ // CLEARED TODAY                              │  ← section label
│ ┌─ rack ────────────────────────────────── ┐ │
│ │ [acc][callsign][name][landed time]         │  ← dim strip, no expand, no note visible
│ └───────────────────────────────────────── ┘ │
│                                               │
│ + SQUAWK NEW FLIGHT                           │  ← add button
└─────────────────────────────────────────────┘
```

### FlightStrip (components/FlightStrip/index.tsx)

Each strip is a horizontal row inside the rack. Layout columns:

1. **Accent bar** (5px) — color reflects status
2. **Callsign column** (80px) — callsign + direction symbol, right-bordered
3. **Main column** (flex) — flight name, next unchecked waypoint hint, note preview (italic, truncated)
4. **Right column** (90px) — waypoint progress `n/n wpts`, status symbol

Clicking a non-cleared strip toggles inline expansion below the strip row. Cleared strips are not expandable — they show only callsign, name, and landed time. To access a cleared flight's note or waypoints, use undo dismiss.

**Expanded state** shows:
- Full waypoint list with checkboxes (indent aligned under main column)
- Pilot note (editable inline via click-to-edit)
- Action row: `⏱ HOLD PATTERN` · `+ WAYPOINT` · `✈ CLEAR TO LAND`

Rename (click the flight name) works inline in the collapsed strip header, same as today.

## Component File Map

```
src/
  types.ts                       re-exports Flight, Task, AppData
  context/
    FlightsContext.tsx            state, all actions, provider
  hooks/
    useFlights.ts                 re-exports useFlight from context + isDismissedToday, isSnoozed, snoozeLabel helpers
  components/
    FlightStrip/
      index.tsx                   strip layout, expand/collapse, rename
      WaypointList.tsx            waypoint rows with checkboxes
      FlightStripActions.tsx      hold pattern / clear to land / add waypoint buttons
      icons.tsx                   unchanged
  utils/
    callsign.ts                   generateCallsign(name) → string
    notifications.ts              unchanged
    storage.ts                    unchanged (key: "aloft-data")
  App.tsx                         TRACON board, rack sections, add-flight form
  main.tsx                        unchanged
```

## Context API

`FlightsContext` exposes:

```ts
interface FlightsContextValue {
  data: AppData
  active: Flight[]           // not dismissed today
  done: Flight[]             // dismissed today
  notificationStatus: string
  requestNotification: () => void
  addFlight: (name: string) => void
  deleteFlight: (id: string) => void
  dismissFlight: (id: string) => void   // clears to land — prunes done waypoints, sets dismissedOn
  undoDismiss: (id: string) => void
  snoozeFlight: (id: string, ms: number | null) => void
  renameFlight: (id: string, name: string) => void
  setNote: (id: string, note: string | null) => void
  addWaypoint: (flightId: string, text: string) => void
  toggleWaypoint: (flightId: string, taskId: string) => void
  deleteWaypoint: (flightId: string, taskId: string) => void
  editWaypoint: (flightId: string, taskId: string, text: string) => void
}
```

## Notification Copy

Existing notification logic is unchanged. Update body copy:

- Before: `"${n} ball${n>1?'s':''} still need attention."`
- After: `"${n} flight${n>1?'s':''} still airborne."`

## Storage Migration

On first load, if `data.balls` exists in localStorage and `data.flights` does not, migrate: rename the array key and add `callsign` and `note: null` to each entry. This runs once in `loadData()` in `utils/storage.ts`.

## Out of Scope

- Horizontal/landscape board layout (current vertical strip rack is sufficient for a personal tool)
- Drag-to-reorder strips
- Multiple boards / categories
- Any backend or sync
