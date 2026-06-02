import { createContext, useContext, useEffect, useState } from 'react';
import type { AppData, Ball } from '@aloft/types';
import { getTodayStr, isDismissedToday, newId } from '../hooks/useBalls';
import { restoreSnoozedNotifications, scheduleWakeNotification } from '../utils/notifications';
import { loadData, loadNotificationState, saveData, saveNotificationState } from '../utils/storage';

export interface BallsContextValue {
    data: AppData;
    active: Ball[];
    done: Ball[];
    notificationStatus: string;
    requestNotification: () => void;
    addBall: (name: string) => void;
    deleteBall: (id: string) => void;
    dismissBall: (id: string) => void;
    undoDismiss: (id: string) => void;
    snoozeBall: (id: string, ms: number | null) => void;
    renameBall: (id: string, name: string) => void;
    addTask: (ballId: string, text: string) => void;
    toggleTask: (ballId: string, taskId: string) => void;
    deleteTask: (ballId: string, taskId: string) => void;
    editTask: (ballId: string, taskId: string, text: string) => void;
}

const BallsContext = createContext<BallsContextValue | null>(null);

export const BallsProvider = ({ children }: { children: React.ReactNode }) => {
    const [data, setData] = useState<AppData>(loadData);
    const [notificationStatus, setNotificationStatus] = useState<string>(() => {
        try {
            return Notification.permission;
        } catch {
            return 'unsupported';
        }
    });

    useEffect(() => {
        saveData(data);
    }, [data]);

    useEffect(() => {
        restoreSnoozedNotifications(data.balls);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (notificationStatus !== 'granted') return;
        const checkNotification = () => {
            const now = new Date();
            const today = getTodayStr();
            const hour = now.getHours();
            const state = loadNotificationState();
            const fired = state.date === today ? state : { date: today, morning: false, afternoon: false };
            const active = data.balls.filter((b) => !isDismissedToday(b));
            if (active.length === 0) return;
            let updated = { ...fired };
            let shouldFire = false;
            if (hour >= 9 && hour < 14 && !fired.morning) {
                updated.morning = true;
                shouldFire = true;
            } else if (hour >= 14 && !fired.afternoon) {
                updated.afternoon = true;
                shouldFire = true;
            }
            if (!shouldFire) return;
            saveNotificationState(updated);
            try {
                new Notification('Aloft', {
                    body: `${active.length} ball${active.length > 1 ? 's' : ''} still need attention.`,
                    icon: '/favicon.ico',
                });
            } catch {
                /* not supported in this context */
            }
        };
        checkNotification();
        const interval = setInterval(checkNotification, 60_000);
        return () => clearInterval(interval);
    }, [notificationStatus, data.balls]);

    const requestNotification = () => {
        try {
            Notification.requestPermission().then((p) => setNotificationStatus(p));
        } catch {
            setNotificationStatus('unsupported');
        }
    };

    const addBall = (name: string) => {
        setData((d) => ({
            ...d,
            balls: [...d.balls, { id: newId(), name, tasks: [], dismissedOn: null, snoozedUntil: null }],
        }));
    };

    const deleteBall = (id: string) => {
        setData((d) => ({ ...d, balls: d.balls.filter((b) => b.id !== id) }));
    };

    const dismissBall = (id: string) => {
        setData((d) => ({
            ...d,
            balls: d.balls.map((b) => (b.id === id ? { ...b, dismissedOn: getTodayStr() } : b)),
        }));
    };

    const undoDismiss = (id: string) => {
        setData((d) => ({
            ...d,
            balls: d.balls.map((b) => (b.id === id ? { ...b, dismissedOn: null, snoozedUntil: null } : b)),
        }));
    };

    const snoozeBall = (id: string, ms: number | null) => {
        const until =
            ms === null
                ? (() => {
                      const d = new Date();
                      d.setHours(24, 0, 0, 0);
                      return d.getTime();
                  })()
                : Date.now() + ms;
        setData((d) => ({
            ...d,
            balls: d.balls.map((b) => (b.id === id ? { ...b, snoozedUntil: until, dismissedOn: null } : b)),
        }));
        scheduleWakeNotification({ snoozedUntil: until } as Ball);
    };

    const renameBall = (id: string, name: string) => {
        setData((d) => ({ ...d, balls: d.balls.map((b) => (b.id === id ? { ...b, name } : b)) }));
    };

    const addTask = (ballId: string, text: string) => {
        setData((d) => ({
            ...d,
            balls: d.balls.map((b) =>
                b.id === ballId ? { ...b, tasks: [...b.tasks, { id: newId(), text, done: false }] } : b,
            ),
        }));
    };

    const toggleTask = (ballId: string, taskId: string) => {
        setData((d) => ({
            ...d,
            balls: d.balls.map((b) =>
                b.id === ballId
                    ? { ...b, tasks: b.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
                    : b,
            ),
        }));
    };

    const deleteTask = (ballId: string, taskId: string) => {
        setData((d) => ({
            ...d,
            balls: d.balls.map((b) => (b.id === ballId ? { ...b, tasks: b.tasks.filter((t) => t.id !== taskId) } : b)),
        }));
    };

    const editTask = (ballId: string, taskId: string, text: string) => {
        setData((d) => ({
            ...d,
            balls: d.balls.map((b) =>
                b.id === ballId ? { ...b, tasks: b.tasks.map((t) => (t.id === taskId ? { ...t, text } : t)) } : b,
            ),
        }));
    };

    const value: BallsContextValue = {
        data,
        active: data.balls.filter((b) => !isDismissedToday(b)),
        done: data.balls.filter((b) => isDismissedToday(b)),
        notificationStatus,
        requestNotification,
        addBall,
        deleteBall,
        dismissBall,
        undoDismiss,
        snoozeBall,
        renameBall,
        addTask,
        toggleTask,
        deleteTask,
        editTask,
    };

    return <BallsContext.Provider value={value}>{children}</BallsContext.Provider>;
};

export const useBalls = (): BallsContextValue => {
    const context = useContext(BallsContext);
    if (!context) {
        throw new Error('useBalls must be used within a BallsProvider');
    }
    return context;
};
