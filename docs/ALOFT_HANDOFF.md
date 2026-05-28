# Aloft — Handoff Document

## What This Is

A personal daily juggling tool. The core mechanic: every plate surfaces every morning, and stays in your face until you either dismiss it for the day or snooze it for a specific window. It's designed to replace the mental overhead of tracking multiple parallel projects and relationships — the equivalent of Slack's "Remind me" but for your daily work context.

The concept was validated in a Claude artifact. This document captures current state, known limitations, and the path forward as a proper hosted app.

---

## Current State (Artifact Prototype)

The prototype is a single React component (`aloft.jsx`) with no backend, no build step, and no external dependencies beyond React itself. Everything is stored in `localStorage`.

### Data Model

All state lives under the key `aloft_v1` in localStorage as JSON:

```json
{
  "plates": [
    {
      "id": "string (timestamp-based)",
      "name": "string",
      "tasks": [
        { "id": "string", "text": "string", "done": false }
      ],
      "dismissedOn": "YYYY-MM-DD or null",
      "snoozedUntil": "unix timestamp ms or null"
    }
  ]
}
```

A second key `aloft_notif_fired` tracks whether the 9am and 2pm notifications have fired for the current day:

```json
{ "date": "YYYY-MM-DD", "morning": true, "afternoon": false }
```

### Plate States

A plate is in one of three states at any given moment:

- **Active** — needs attention today. Green dot.
- **Snoozed** — temporarily quiet. Purple dot with countdown badge (e.g. "⏱ 47m"). Reactivates automatically when the timer expires.
- **Dismissed** — done for today. Resets to active at midnight. Grey dot.

The distinction between snoozed and dismissed:
- `dismissedOn === today` → dismissed until midnight
- `snoozedUntil > Date.now()` → snoozed until that timestamp
- Both checks live in `isDismissedToday(plate)`

### Features Implemented

- Add / delete / rename plates
- Add / edit / delete tasks per plate (tasks are optional — plates can be task-free)
- Mark tasks complete
- Dismiss plate for the day (one tap)
- Undo dismiss
- Snooze with quick picks: 20 min, 1 hr, 2 hr, Tomorrow (midnight)
- Wake a snoozed plate early
- Browser notifications at 9am and 2pm if undismissed plates remain
- Snooze wake notification via `setTimeout` (fires when tab is open)
- Notification permission request UI (hidden on iOS Safari which doesn't support it)
- Task progress badge (e.g. "2/4")
- "All done" banner when every plate is dismissed

### Known Limitations in Prototype

1. **Notifications are tab-dependent.** Both the 9am/2pm scheduled notifications and snooze wake notifications use `setInterval`/`setTimeout` inside the React component. If the tab is backgrounded on mobile, the OS suspends JavaScript and notifications don't fire. On desktop Chrome they're reasonably reliable but not guaranteed.

2. **No cross-device sync.** localStorage is per-browser per-device. Your plates on your phone aren't the same as on your laptop.

3. **No PWA / home screen install.** There's no `manifest.json` or service worker, so the app can't be added to the home screen as a standalone app.

4. **IDs are timestamp-based.** `newId()` uses `Date.now()` with a counter. Fine for single-user local use, would need to be replaced with UUIDs for any multi-device or backend scenario.

5. **No daily reset logic on load.** The daily reset is implicit — `dismissedOn` is compared against today's date string on every render. This is correct but means there's no "end of day" event or migration hook if the data model changes.

---

## Path Forward: Proper Hosted App

### Step 1 — Scaffold as a Vite + React app

```bash
npm create vite@latest aloft -- --template react
cd aloft
npm install
```

Move `aloft.jsx` content into `src/App.jsx`. It should work as-is since it has no external dependencies.

### Step 2 — Add a Service Worker for Reliable Notifications

This is the most important upgrade. A service worker runs independently of the tab and can fire notifications even when the browser is in the background (as long as the browser process is running — nothing can notify when the phone is fully locked on iOS due to Apple's restrictions).

**Register the service worker in `src/main.jsx`:**

```js
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
```

**Create `public/sw.js`:**

```js
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, delayMs } = event.data;
    setTimeout(() => {
      self.registration.showNotification(title, { body, icon: '/icon.png' });
    }, delayMs);
  }
});
```

**Send snooze timers to the service worker from the app:**

```js
function scheduleNotification(title, body, delayMs) {
  navigator.serviceWorker.ready.then(reg => {
    reg.active.postMessage({ type: 'SCHEDULE_NOTIFICATION', title, body, delayMs });
  });
}
```

For the 9am/2pm daily notifications, use the Push API with a backend (see Step 4) rather than `setTimeout` — `setTimeout` in a service worker doesn't survive browser restarts.

### Step 3 — Add a `manifest.json` for PWA Install

In `public/manifest.json`:

```json
{
  "name": "Aloft",
  "short_name": "Aloft",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0f0f0f",
  "theme_color": "#0f0f0f",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Reference it in `index.html`:
```html
<link rel="manifest" href="/manifest.json">
```

Once deployed, Chrome and Safari will offer an "Add to Home Screen" prompt. On iOS this still won't give you push notifications (Apple restriction) but it gives you the full-screen standalone experience.

### Step 4 — Backend for Reliable Scheduled Notifications (Optional but Recommended)

For truly reliable daily notifications, you need a server-side scheduler. The minimal version:

- A small FastAPI or Express backend
- Stores each user's notification preferences (9am, 2pm, timezone)
- Uses Web Push (via `web-push` npm package or `pywebpush`) to push to subscribed devices
- A cron job (or Azure Function on a timer trigger, given your stack) runs at 9am and 2pm and pushes to any subscribers who have undismissed plates

This requires storing a `PushSubscription` object (obtained from the browser via `registration.pushManager.subscribe()`) server-side. The subscription is per-device, so cross-device sync falls out naturally once you have a backend.

### Step 5 — Cross-Device Sync (If Needed)

If localStorage turns out to be sufficient (single device use), skip this. If you want sync:

- Replace localStorage with a lightweight backend — a single Postgres table or even Azure Table Storage
- Auth can be as simple as a magic link email or "sign in with Microsoft" via MSAL (already in your ecosystem)
- The data model is simple enough that a single `plates` table with a `user_id` foreign key covers it

---

## Suggested File Structure for the Real App

```
aloft/
├── public/
│   ├── sw.js              # Service worker
│   ├── manifest.json      # PWA manifest
│   └── icon-192.png
├── src/
│   ├── App.jsx            # Main app (current aloft.jsx content)
│   ├── components/
│   │   └── PlateCard.jsx  # Extract PlateCard into its own file
│   ├── hooks/
│   │   └── usePlates.js   # Extract all plate state/logic from App
│   ├── utils/
│   │   ├── storage.js     # localStorage helpers
│   │   └── notifications.js # Notification + SW helpers
│   └── main.jsx
├── index.html
└── vite.config.js
```

---

## Immediate Next Steps

1. `npm create vite@latest` and paste in the current component
2. Verify it runs locally — it should need zero changes
3. Add `public/sw.js` and the service worker registration
4. Deploy to Vercel (free, zero config for Vite apps): `vercel --prod`
5. Test notifications from the deployed URL (service workers require HTTPS)
6. Add `manifest.json` and icons, redeploy, install to home screen

The backend / sync work is optional and can wait until you've validated the hosted version feels right as a daily habit.
