# Hold Pattern Options Expansion

**Date:** 2026-06-04

## Summary

Expand the hold pattern dropdown from 4 options to 5, matching Slack's "Remind me" preset progression. Swap 2 HR for 3 HR and add NEXT WEEK (next Monday at midnight). Refactor `snoozeFlight` to accept an absolute `until` timestamp instead of a millisecond duration.

## Options

| Label     | Value                              |
| --------- | ---------------------------------- |
| 20 MIN    | `Date.now() + 20 * 60 * 1000`      |
| 1 HR      | `Date.now() + 60 * 60 * 1000`      |
| 3 HR      | `Date.now() + 3 * 60 * 60 * 1000`  |
| TOMORROW  | midnight tonight (next `00:00:00`) |
| NEXT WEEK | next Monday `00:00:00`             |

## API Change

`snoozeFlight(id: string, ms: number | null)` → `snoozeFlight(id: string, until: number)`

All timestamp computation moves to `FlightStripActions`. A helper `nextMonday()` computes the upcoming Monday at 00:00:00 (if today is Monday, returns the following Monday).

## Files Changed

- `apps/web/src/components/FlightStrip/FlightStripActions.tsx` — update `HOLD_OPTIONS` and compute `until` timestamps before calling `snoozeFlight`
- `apps/web/src/context/FlightsContext.tsx` — simplify `snoozeFlight` to accept `until: number` directly

## Out of Scope

- Custom date/time picker (deferred)
- Visual redesign of the dropdown
