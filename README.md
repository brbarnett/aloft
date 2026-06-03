# Aloft

A retro ATC-themed TRACON board for tracking ongoing work — keep your flights airborne, clear them to land, and hold the ones that can wait.

## Prerequisites

- **Node.js** v22+
- **pnpm** — install via:
    ```bash
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    ```
    Or if you already have Node.js, enable via Corepack:
    ```bash
    corepack enable pnpm
    ```

## Setup

```bash
pnpm install
```

## Development

```bash
make dev        # start the web dev server (http://localhost:5173)
make typecheck  # type-check all packages
make build      # production build
make preview    # preview production build
make clean      # remove dist and node_modules
```

## Features

- **Flight strips** — each ongoing initiative is a flight with a callsign auto-generated from its name
- **Waypoints** — ordered checklist items per flight; done waypoints are pruned on landing
- **Pilot notes** — freeform sticky note per flight, visible in the expanded strip
- **CLEAR TO LAND** — dismisses a flight for the day; it returns automatically tomorrow
- **HOLD PATTERN** — snooze a flight for 20 min, 1 hr, 2 hr, or until tomorrow
- **Notifications** — optional browser notifications at 9 AM and 2 PM when flights are airborne
- **Persistent storage** — data saved to `localStorage` under key `aloft_v1`; survives page reloads

## Project Structure

```
apps/
  web/    — Vite + React 19 + TypeScript + Tailwind CSS v4 frontend (@aloft/web)
  api/    — Backend (placeholder, not yet implemented)
packages/
  types/  — Shared TypeScript interfaces (@aloft/types)
            Flight, Task, AppData
```

### Key source files

```
apps/web/src/
  context/FlightsContext.tsx   — all flight state, actions, and notification scheduling
  hooks/useFlights.ts          — re-exports useFlights and helpers
  utils/storage.ts             — localStorage load/save with migration from legacy schema
  utils/notifications.ts       — service worker wake notifications for snoozed flights
  components/FlightStrip/
    index.tsx                  — horizontal strip layout with expand/collapse
    WaypointList.tsx           — waypoint checklist with inline add/edit
    FlightStripActions.tsx     — HOLD PATTERN and CLEAR TO LAND buttons
    icons.tsx                  — SVG icon components
  App.tsx                      — TRACON board layout (AIRBORNE / CLEARED TODAY sections)
  index.css                    — Tailwind v4 config + retro scanline/vignette effects
```
