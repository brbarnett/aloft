import { createContext, useContext, useEffect, useState } from 'react';
import type { AppData, Flight } from '@aloft/types';
import { restoreSnoozedNotifications, scheduleWakeNotification } from '../utils/notifications';
import { loadData, loadNotificationState, saveData, saveNotificationState } from '../utils/storage';

const generateCallsign = (name: string): string => {
    const words = name.trim().split(/\s+/);
    const letters = words.slice(0, 3).map((w) => w[0]?.toUpperCase() ?? 'X');
    while (letters.length < 3) letters.push('X');
    const num = String(Math.floor(Math.random() * 99) + 1).padStart(2, '0');
    return `${letters.join('')}-${num}`;
};

export const getTodayStr = (): string => new Date().toISOString().split('T')[0];

export const isDismissedToday = (flight: Flight): boolean => {
    if (flight.dismissedOn === getTodayStr()) return true;
    if (flight.snoozedUntil && Date.now() < flight.snoozedUntil) return true;
    return false;
};

export const isSnoozed = (flight: Flight): boolean => !!(flight.snoozedUntil && Date.now() < flight.snoozedUntil);

export const snoozeLabel = (flight: Flight): string => {
    if (!flight.snoozedUntil) return '';
    const diff = flight.snoozedUntil - Date.now();
    if (diff <= 0) return '';
    const mins = Math.ceil(diff / 60000);
    if (mins < 60) return `${mins}m`;
    return `${Math.ceil(diff / 3600000)}h`;
};

let idCounter = Date.now();
export const newId = (): string => String(++idCounter);

export interface FlightsContextValue {
    data: AppData;
    active: Flight[];
    done: Flight[];
    notificationStatus: string;
    requestNotification: () => void;
    addFlight: (name: string) => void;
    deleteFlight: (id: string) => void;
    dismissFlight: (id: string) => void;
    undoDismiss: (id: string) => void;
    snoozeFlight: (id: string, ms: number | null) => void;
    renameFlight: (id: string, name: string) => void;
    setNote: (id: string, note: string | null) => void;
    addWaypoint: (flightId: string, text: string) => void;
    toggleWaypoint: (flightId: string, taskId: string) => void;
    deleteWaypoint: (flightId: string, taskId: string) => void;
    editWaypoint: (flightId: string, taskId: string, text: string) => void;
}

const FlightsContext = createContext<FlightsContextValue | null>(null);

export const FlightsProvider = ({ children }: { children: React.ReactNode }) => {
    const [data, setData] = useState<AppData>(loadData);
    const [, setTick] = useState(0);
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
        restoreSnoozedNotifications(data.flights);
    }, []);

    useEffect(() => {
        const snoozed = data.flights.filter((f) => f.snoozedUntil && f.snoozedUntil > Date.now());
        if (snoozed.length === 0) return;
        const earliest = Math.min(...snoozed.map((f) => f.snoozedUntil!));
        const timer = setTimeout(() => setTick((n) => n + 1), earliest - Date.now());
        return () => clearTimeout(timer);
    }, [data.flights]);

    useEffect(() => {
        if (notificationStatus !== 'granted') return;
        const checkNotification = () => {
            const now = new Date();
            const today = getTodayStr();
            const hour = now.getHours();
            const state = loadNotificationState();
            const fired = state.date === today ? state : { date: today, morning: false, afternoon: false };
            const active = data.flights.filter((f) => !isDismissedToday(f));
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
                    body: `${active.length} flight${active.length > 1 ? 's' : ''} still airborne.`,
                    icon: '/favicon.ico',
                });
            } catch {
                /* not supported in this context */
            }
        };
        checkNotification();
        const interval = setInterval(checkNotification, 60_000);
        return () => clearInterval(interval);
    }, [notificationStatus, data.flights]);

    const requestNotification = () => {
        try {
            Notification.requestPermission().then((p) => setNotificationStatus(p));
        } catch {
            setNotificationStatus('unsupported');
        }
    };

    const addFlight = (name: string) => {
        setData((d) => ({
            ...d,
            flights: [
                ...d.flights,
                {
                    id: newId(),
                    callsign: generateCallsign(name),
                    name,
                    tasks: [],
                    note: null,
                    dismissedOn: null,
                    snoozedUntil: null,
                },
            ],
        }));
    };

    const deleteFlight = (id: string) => {
        setData((d) => ({ ...d, flights: d.flights.filter((f) => f.id !== id) }));
    };

    const dismissFlight = (id: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) =>
                f.id === id ? { ...f, tasks: f.tasks.filter((t) => !t.done), dismissedOn: getTodayStr() } : f,
            ),
        }));
    };

    const undoDismiss = (id: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) => (f.id === id ? { ...f, dismissedOn: null, snoozedUntil: null } : f)),
        }));
    };

    const snoozeFlight = (id: string, ms: number | null) => {
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
            flights: d.flights.map((f) => (f.id === id ? { ...f, snoozedUntil: until, dismissedOn: null } : f)),
        }));
        scheduleWakeNotification({ snoozedUntil: until } as Flight);
    };

    const renameFlight = (id: string, name: string) => {
        setData((d) => ({ ...d, flights: d.flights.map((f) => (f.id === id ? { ...f, name } : f)) }));
    };

    const setNote = (id: string, note: string | null) => {
        setData((d) => ({ ...d, flights: d.flights.map((f) => (f.id === id ? { ...f, note } : f)) }));
    };

    const addWaypoint = (flightId: string, text: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) =>
                f.id === flightId ? { ...f, tasks: [...f.tasks, { id: newId(), text, done: false }] } : f,
            ),
        }));
    };

    const toggleWaypoint = (flightId: string, taskId: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) =>
                f.id === flightId
                    ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
                    : f,
            ),
        }));
    };

    const deleteWaypoint = (flightId: string, taskId: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) =>
                f.id === flightId ? { ...f, tasks: f.tasks.filter((t) => t.id !== taskId) } : f,
            ),
        }));
    };

    const editWaypoint = (flightId: string, taskId: string, text: string) => {
        setData((d) => ({
            ...d,
            flights: d.flights.map((f) =>
                f.id === flightId ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, text } : t)) } : f,
            ),
        }));
    };

    const value: FlightsContextValue = {
        data,
        active: data.flights.filter((f) => !isDismissedToday(f)),
        done: data.flights.filter((f) => isDismissedToday(f)),
        notificationStatus,
        requestNotification,
        addFlight,
        deleteFlight,
        dismissFlight,
        undoDismiss,
        snoozeFlight,
        renameFlight,
        setNote,
        addWaypoint,
        toggleWaypoint,
        deleteWaypoint,
        editWaypoint,
    };

    return <FlightsContext.Provider value={value}>{children}</FlightsContext.Provider>;
};

export const useFlights = (): FlightsContextValue => {
    const context = useContext(FlightsContext);
    if (!context) throw new Error('useFlights must be used within a FlightsProvider');
    return context;
};
