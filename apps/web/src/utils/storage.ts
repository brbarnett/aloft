import type { AppData } from '@aloft/types';

const NOTIFICATION_KEY = 'aloft_notification_fired';

export interface NotificationState {
    date: string;
    morning: boolean;
    afternoon: boolean;
}

export const loadData = async (): Promise<AppData> => {
    try {
        const res = await fetch('/api/data');
        if (!res.ok) return { flights: [] };
        return res.json() as Promise<AppData>;
    } catch {
        return { flights: [] };
    }
};

export const saveData = async (data: AppData): Promise<void> => {
    try {
        await fetch('/api/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
    } catch {
        console.error('Failed to save data to backend');
    }
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
