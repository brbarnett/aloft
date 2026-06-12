# Aloft

A retro ATC-themed TRACON board for tracking ongoing work — keep your flights airborne, clear them to land, and hold the ones that can wait.

## Prerequisites

- **Node.js** v25+
- **pnpm** — install via:
    ```bash
    curl -fsSL https://get.pnpm.io/install.sh | sh -
    ```
    Or if you already have Node.js, enable via Corepack:
    ```bash
    corepack enable pnpm
    ```
- **Docker** — for local MongoDB and production image builds

## Setup

```bash
pnpm install
cp apps/api/.env.example apps/api/.env
# Fill in GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, JWT_SECRET in apps/api/.env
```

## Development

Start MongoDB, then run the frontend and backend dev servers:

```bash
make up       # start MongoDB + mongo-express in Docker (http://localhost:8081)
make dev      # start both the web dev server (http://localhost:5173) and API (http://localhost:3001)
```

Or run them independently:

```bash
make frontend   # web dev server only
make backend    # API only (with hot reload)
```

Other commands:

```bash
make typecheck  # type-check all packages
make build      # production build
make preview    # preview production frontend build
make down       # stop Docker services
make clean      # remove dist and node_modules
```

## Docker

Build and run the production image locally (uses the Compose MongoDB):

```bash
make up       # ensure MongoDB is running
make image    # build the Docker image
make run      # run the image at http://localhost:8080
```

## Features

- **Flight strips** — each ongoing initiative is a flight with a callsign auto-generated from its name
- **Waypoints** — ordered checklist items per flight; done waypoints are pruned on landing
- **Pilot notes** — freeform sticky note per flight, visible in the expanded strip
- **CLEAR TO LAND** — dismisses a flight for the day; it returns automatically tomorrow
- **HOLD PATTERN** — snooze a flight for 20 min, 1 hr, 2 hr, or until tomorrow
- **Notifications** — optional browser notifications at 9 AM and 2 PM when flights are airborne
- **Persistent storage** — data saved to MongoDB, per-user via Google OAuth

## Project Structure

```
apps/
  web/    — Vite + React 19 + TypeScript + Tailwind CSS v4 frontend (@aloft/web)
  api/    — Fastify + MongoDB API with Google OAuth + JWT auth (@aloft/api)
packages/
  types/  — Shared TypeScript interfaces (@aloft/types)
            Flight, Task, UserProfile, AppData
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

apps/api/src/
  index.ts                     — Fastify server, route definitions, /api/health
  auth.ts                      — Google OAuth2 callback, JWT cookie, /api/me
  data.ts                      — MongoDB queries for user flights and profile upsert
  db.ts                        — MongoClient singleton (connect, getDb, ping)
```
