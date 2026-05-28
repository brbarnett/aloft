import type { AppData } from '@aloft/types';

const STORAGE_KEY = 'aloft_v1';
const NOTIFICATION_KEY = 'aloft_notification_fired';

export interface NotificationState {
  date: string;
  morning: boolean;
  afternoon: boolean;
}

export const loadData = (): AppData => {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') || { balls: [] };
    return {
      balls: (raw.balls ?? []).map((b: Record<string, unknown>) => ({
        ...b,
        snoozedUntil: (b.snoozedUntil as number | null | undefined) ?? null,
        dismissedOn: (b.dismissedOn as string | null | undefined) ?? null,
      })),
    };
  } catch {
    return { balls: [] };
  }
};

export const saveData = (data: AppData): void => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
};

export const loadNotificationState = (): NotificationState => {
  try {
    return JSON.parse(localStorage.getItem(NOTIFICATION_KEY) ?? '{}') || {};
  } catch {
    return {} as NotificationState;
  }
};

export const saveNotificationState = (state: NotificationState): void => {
  localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(state));
};
