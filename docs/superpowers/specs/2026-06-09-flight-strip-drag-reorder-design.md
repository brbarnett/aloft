# Flight Strip Drag-to-Reorder

**Date:** 2026-06-09
**Status:** Approved

## Overview

Allow users to drag and drop flight strips within the airborne section to manually reorder them by priority. Order persists cross-browser via the backend API (stored in `appdata.json` per user).

## Decisions Made

| Question            | Decision                                       |
| ------------------- | ---------------------------------------------- |
| Persist order?      | Yes — saved to backend API (cross-browser)     |
| New flight position | Bottom (appended last)                         |
| Drag handle         | Left grip icon (⠿)                             |
| Drag feedback       | Ghost + placeholder (A)                        |
| Touch support       | Yes — via dnd-kit PointerSensor                |
| Library             | dnd-kit (`@dnd-kit/core`, `@dnd-kit/sortable`) |

## Data Model

Add `order?: number` to the `Flight` type in `packages/types/src/index.ts`:

```ts
interface Flight {
    id: string;
    callsign: string;
    name: string;
    tasks: Task[];
    note: string | null;
    dismissedOn: string | null;
    snoozedUntil: number | null;
    order?: number; // NEW — position in airborne section, undefined = bottom
}
```

On drag end, all active (non-dismissed) flights are reassigned sequential integers (`0, 1, 2, …`) matching the new order and persisted via the existing `PUT /api/data` endpoint — the same call all other mutations use. The `order` field is included automatically since the full `flights` array is serialized. Dismissed flights retain their `order` value so that undismissing a flight restores it to its relative position.

The `active` computed array sorts by `order` ascending, with `undefined` last. No changes to the API layer are required.

## Architecture

### New packages

```
pnpm add @dnd-kit/core @dnd-kit/sortable
```

Added to `apps/web`.

### FlightsContext — new action

```ts
reorderFlights(orderedIds: string[]): void
```

Maps each ID to its new index, writes `order` onto each flight object, and calls `saveData(next)` — the same pattern as all other mutations. `saveData` issues `PUT /api/data` with the full flights array, persisting order cross-browser. Only active (non-dismissed) flights have their `order` updated.

### App.tsx — DnD wrapper

The airborne section's `<div>` is wrapped with:

```tsx
<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
    <SortableContext items={active.map((f) => f.id)} strategy={verticalListSortingStrategy}>
        {active.map((flight) => (
            <FlightStrip key={flight.id} flight={flight} />
        ))}
    </SortableContext>
    <DragOverlay>
        {draggingId ? <FlightStrip flight={active.find((f) => f.id === draggingId)!} isDragOverlay /> : null}
    </DragOverlay>
</DndContext>
```

`onDragEnd` calls `arrayMove` (from `@dnd-kit/sortable`) then `reorderFlights` with the new ID order.

`PointerSensor` is configured with a 5px activation distance to prevent accidental drags while scrolling on touch.

### FlightStrip — sortable wrapper + drag state

`useSortable(id)` is called at the top of the component. The `transform`, `transition`, and `setNodeRef` values from `useSortable` are applied to the strip's outermost `<div>` so dnd-kit can animate the shift-to-make-room effect on non-dragging strips.

When `isDragging` is true:

- Strip dims to ~30% opacity
- Border switches to dashed `#2a5c2a`
- A `<DragHandle>` is rendered on the far left

When `isDragOverlay` prop is true (the ghost clone inside `DragOverlay`):

- Full opacity
- Bright green border (`#86efac`)
- Drop shadow

### DragHandle component

New file: `apps/web/src/components/FlightStrip/DragHandle.tsx`

```tsx
function DragHandle({ listeners, attributes }) {
    return (
        <div
            {...listeners}
            {...attributes}
            style={{ cursor: 'grab', touchAction: 'none' }}
            className="text-[#2a5c2a] hover:text-[#4ade80] px-1 flex-shrink-0 select-none"
        >
            ⠿
        </div>
    );
}
```

Pointer events are scoped to this element only. Clicking anywhere else on the strip still toggles the expanded/collapsed state.

## Interaction Behavior

- **Drag start**: grip the ⠿ handle (mouse or touch), drag vertically
- **While dragging**: original slot shows dimmed dashed placeholder; ghost clone follows cursor/finger
- **Drop**: strips animate to final positions; new `order` values are saved immediately
- **Cancel (Escape / pointer released outside)**: strips snap back, no save
- **New flight added**: appended at the bottom (`order` is `undefined` until first drag)
- **Dismissed flight**: `order` value preserved; un-dismissing restores relative position

## Scope Constraints

- Reordering is airborne section only. The "CLEARED TODAY" section is not sortable.
- No keyboard drag support beyond what dnd-kit provides by default (accessible via keyboard after focused).
- No animations between non-drag state changes (e.g., new flight added just appears at bottom).
