import type { Ball } from '@aloft/types';

export { useBalls } from '../context/BallsContext';

export const getTodayStr = (): string => new Date().toISOString().split('T')[0];

export const isDismissedToday = (ball: Ball): boolean => {
    if (ball.dismissedOn === getTodayStr()) return true;
    if (ball.snoozedUntil && Date.now() < ball.snoozedUntil) return true;
    return false;
};

export const isSnoozed = (ball: Ball): boolean => !!(ball.snoozedUntil && Date.now() < ball.snoozedUntil);

export const snoozeLabel = (ball: Ball): string => {
    if (!ball.snoozedUntil) return '';
    const diff = ball.snoozedUntil - Date.now();
    if (diff <= 0) return '';
    const mins = Math.ceil(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.ceil(diff / 3600000)}h`;
};

let idCounter = Date.now();
export const newId = (): string => String(++idCounter);
