import type { Flight } from '@aloft/types';

export const registerServiceWorker = (): void => {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js');
    }
};

export const scheduleWakeNotification = (flight: Flight): void => {
    if (!flight.snoozedUntil) return;
    const delayMs = flight.snoozedUntil - Date.now();
    if (delayMs <= 0) return;
    navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({
            type: 'SCHEDULE_NOTIFICATION',
            title: 'Aloft',
            body: 'Time to check back in.',
            delayMs,
        });
    });
};

export const restoreSnoozedNotifications = (flights: Flight[]): void => {
    flights.filter((f) => f.snoozedUntil && f.snoozedUntil > Date.now()).forEach(scheduleWakeNotification);
};
