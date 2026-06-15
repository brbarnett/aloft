import { createContext, useContext, useEffect, useState } from 'react';
import type { Flight, UserData, UserProfile } from '@aloft/types';
import { restoreSnoozedNotifications, scheduleWakeNotification } from '../utils/notifications';
import { getUser, loadData, loadNotificationState, saveData, saveNotificationState } from '../utils/storage';

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

export const isGrounded = (flight: Flight): boolean => !!flight.groundedOn;

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
    data: UserData;
    loading: boolean;
    user: UserProfile | null;
    active: Flight[];
    done: Flight[];
    grounded: Flight[];
    notificationStatus: string;
    requestNotification: () => void;
    addFlight: (name: string) => void;
    deleteFlight: (id: string) => void;
    dismissFlight: (id: string) => void;
    undoDismiss: (id: string) => void;
    snoozeFlight: (id: string, until: number) => void;
    groundFlight: (id: string) => void;
    ungroundFlight: (id: string) => void;
    renameFlight: (id: string, name: string) => void;
    setNote: (id: string, note: string | null) => void;
    addWaypoint: (flightId: string, text: string) => void;
    toggleWaypoint: (flightId: string, taskId: string) => void;
    deleteWaypoint: (flightId: string, taskId: string) => void;
    editWaypoint: (flightId: string, taskId: string, text: string) => void;
    toggleWaypointExpedite: (flightId: string, taskId: string) => void;
    reorderFlights: (orderedIds: string[]) => void;
}

const FlightsContext = createContext<FlightsContextValue | null>(null);

export const FlightsProvider = ({ children }: { children: React.ReactNode }) => {
    const [user, setUser] = useState<UserProfile | null>(null);
    const [data, setData] = useState<UserData>({ flights: [] });
    const [loading, setLoading] = useState(true);
    const [tick, setTick] = useState(0);
    const [notificationStatus, setNotificationStatus] = useState<string>(() => {
        try {
            return Notification.permission;
        } catch {
            return 'unsupported';
        }
    });

    useEffect(() => {
        getUser().then((u) => {
            if (!u) {
                window.location.href = '/login';
                return;
            }
            setUser(u);
            loadData().then((d) => {
                setData(d);
                setLoading(false);
                restoreSnoozedNotifications(d.flights);
            });
        });
    }, []);

    useEffect(() => {
        const snoozed = data.flights.filter((f) => f.snoozedUntil && f.snoozedUntil > Date.now());
        if (snoozed.length === 0) return;
        const earliest = Math.min(...snoozed.map((f) => f.snoozedUntil!));
        const timer = setTimeout(() => setTick((n) => n + 1), earliest - Date.now());
        return () => clearTimeout(timer);
    }, [data.flights]);

    useEffect(() => {
        const midnight = new Date();
        midnight.setHours(24, 0, 0, 0);
        const timer = setTimeout(() => setTick((n) => n + 1), midnight.getTime() - Date.now());
        return () => clearTimeout(timer);
    }, [tick]);

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
        const next = {
            ...data,
            flights: [
                ...data.flights,
                {
                    id: newId(),
                    callsign: generateCallsign(name),
                    name,
                    tasks: [],
                    note: null,
                    dismissedOn: null,
                    groundedOn: null,
                    snoozedUntil: null,
                },
            ],
        };
        setData(next);
        saveData(next);
    };

    const deleteFlight = (id: string) => {
        const next = { ...data, flights: data.flights.filter((f) => f.id !== id) };
        setData(next);
        saveData(next);
    };

    const dismissFlight = (id: string) => {
        const next = {
            ...data,
            flights: data.flights.map((f) =>
                f.id === id ? { ...f, tasks: f.tasks.filter((t) => !t.done), dismissedOn: getTodayStr() } : f,
            ),
        };
        setData(next);
        saveData(next);
    };

    const undoDismiss = (id: string) => {
        const next = {
            ...data,
            flights: data.flights.map((f) => (f.id === id ? { ...f, dismissedOn: null, snoozedUntil: null } : f)),
        };
        setData(next);
        saveData(next);
    };

    const snoozeFlight = (id: string, until: number) => {
        const next = {
            ...data,
            flights: data.flights.map((f) => (f.id === id ? { ...f, snoozedUntil: until, dismissedOn: null } : f)),
        };
        setData(next);
        saveData(next);
        scheduleWakeNotification({ snoozedUntil: until } as Flight);
    };

    const groundFlight = (id: string) => {
        const next = {
            ...data,
            flights: data.flights.map((f) =>
                f.id === id ? { ...f, groundedOn: getTodayStr(), dismissedOn: null, snoozedUntil: null } : f,
            ),
        };
        setData(next);
        saveData(next);
    };

    const ungroundFlight = (id: string) => {
        const next = {
            ...data,
            flights: data.flights.map((f) => (f.id === id ? { ...f, groundedOn: null } : f)),
        };
        setData(next);
        saveData(next);
    };

    const renameFlight = (id: string, name: string) => {
        const next = { ...data, flights: data.flights.map((f) => (f.id === id ? { ...f, name } : f)) };
        setData(next);
        saveData(next);
    };

    const setNote = (id: string, note: string | null) => {
        const next = { ...data, flights: data.flights.map((f) => (f.id === id ? { ...f, note } : f)) };
        setData(next);
        saveData(next);
    };

    const addWaypoint = (flightId: string, text: string) => {
        const next = {
            ...data,
            flights: data.flights.map((f) =>
                f.id === flightId ? { ...f, tasks: [...f.tasks, { id: newId(), text, done: false }] } : f,
            ),
        };
        setData(next);
        saveData(next);
    };

    const toggleWaypoint = (flightId: string, taskId: string) => {
        const next = {
            ...data,
            flights: data.flights.map((f) =>
                f.id === flightId
                    ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) }
                    : f,
            ),
        };
        setData(next);
        saveData(next);
    };

    const deleteWaypoint = (flightId: string, taskId: string) => {
        const next = {
            ...data,
            flights: data.flights.map((f) =>
                f.id === flightId ? { ...f, tasks: f.tasks.filter((t) => t.id !== taskId) } : f,
            ),
        };
        setData(next);
        saveData(next);
    };

    const editWaypoint = (flightId: string, taskId: string, text: string) => {
        const next = {
            ...data,
            flights: data.flights.map((f) =>
                f.id === flightId ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, text } : t)) } : f,
            ),
        };
        setData(next);
        saveData(next);
    };

    const toggleWaypointExpedite = (flightId: string, taskId: string) => {
        const next = {
            ...data,
            flights: data.flights.map((f) =>
                f.id === flightId
                    ? { ...f, tasks: f.tasks.map((t) => (t.id === taskId ? { ...t, expedite: !t.expedite } : t)) }
                    : f,
            ),
        };
        setData(next);
        saveData(next);
    };

    const reorderFlights = (orderedIds: string[]) => {
        const next = {
            ...data,
            flights: data.flights.map((f) => {
                const idx = orderedIds.indexOf(f.id);
                return idx !== -1 ? { ...f, order: idx } : f;
            }),
        };
        setData(next);
        saveData(next);
    };

    const sortByOrder = (a: Flight, b: Flight): number => {
        if (a.order === undefined && b.order === undefined) return 0;
        if (a.order === undefined) return 1;
        if (b.order === undefined) return -1;
        return a.order - b.order;
    };

    const value: FlightsContextValue = {
        data,
        loading,
        user,
        active: data.flights.filter((f) => !isDismissedToday(f) && !isGrounded(f)).sort(sortByOrder),
        done: data.flights.filter((f) => isDismissedToday(f) && !isGrounded(f)),
        grounded: data.flights.filter((f) => isGrounded(f)),
        notificationStatus,
        requestNotification,
        addFlight,
        deleteFlight,
        dismissFlight,
        undoDismiss,
        snoozeFlight,
        groundFlight,
        ungroundFlight,
        renameFlight,
        setNote,
        addWaypoint,
        toggleWaypoint,
        deleteWaypoint,
        editWaypoint,
        toggleWaypointExpedite,
        reorderFlights,
    };

    return <FlightsContext.Provider value={value}>{children}</FlightsContext.Provider>;
};

export const useFlights = (): FlightsContextValue => {
    const context = useContext(FlightsContext);
    if (!context) throw new Error('useFlights must be used within a FlightsProvider');
    return context;
};
