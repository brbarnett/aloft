import type { Ball } from '@aloft/types';

export const registerServiceWorker = (): void => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }
};

export const scheduleWakeNotification = (ball: Ball): void => {
  if (!ball.snoozedUntil) return;
  const delayMs = ball.snoozedUntil - Date.now();
  if (delayMs <= 0) return;
  navigator.serviceWorker.ready.then(reg => {
    reg.active?.postMessage({
      type: 'SCHEDULE_NOTIFICATION',
      title: 'Aloft',
      body: 'Time to check back in.',
      delayMs,
    });
  });
};

export const restoreSnoozedNotifications = (balls: Ball[]): void => {
  balls
    .filter(b => b.snoozedUntil && b.snoozedUntil > Date.now())
    .forEach(scheduleWakeNotification);
};
