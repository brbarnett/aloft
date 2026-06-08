import type { UserData, UserProfile } from '@aloft/types';

const NOTIFICATION_KEY = 'aloft_notification_fired';

export interface NotificationState {
    date: string;
    morning: boolean;
    afternoon: boolean;
}

export const getUser = async (): Promise<UserProfile | null> => {
    try {
        const res = await fetch('/api/me');
        if (!res.ok) return null;
        return res.json() as Promise<UserProfile>;
    } catch {
        return null;
    }
};

export const loadData = async (): Promise<UserData> => {
    try {
        const res = await fetch('/api/data');
        if (res.status === 401) { window.location.href = '/login'; return { flights: [] }; }
        if (!res.ok) return { flights: [] };
        return res.json() as Promise<UserData>;
    } catch {
        return { flights: [] };
    }
};

export const saveData = async (data: UserData): Promise<void> => {
    try {
        const res = await fetch('/api/data', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        if (res.status === 401) { window.location.href = '/login'; }
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
