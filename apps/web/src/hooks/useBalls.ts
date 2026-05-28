import { useState, useEffect } from 'react';
import type { AppData, Ball } from '@aloft/types';
import { loadData, saveData, loadNotificationState, saveNotificationState } from '../utils/storage';
import { scheduleWakeNotification, restoreSnoozedNotifications } from '../utils/notifications';

export const getTodayStr = (): string => new Date().toISOString().split('T')[0];

export const isDismissedToday = (ball: Ball): boolean => {
  if (ball.dismissedOn === getTodayStr()) return true;
  if (ball.snoozedUntil && Date.now() < ball.snoozedUntil) return true;
  return false;
};

export const isSnoozed = (ball: Ball): boolean =>
  !!(ball.snoozedUntil && Date.now() < ball.snoozedUntil);

export const snoozeLabel = (ball: Ball): string => {
  if (!ball.snoozedUntil) return '';
  const diff = ball.snoozedUntil - Date.now();
  if (diff <= 0) return '';
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.ceil(diff / 3600000)}h`;
};

let idCounter = Date.now();
const newId = (): string => String(++idCounter);

export const useBalls = () => {
  const [data, setData] = useState<AppData>(loadData);
  const [notificationStatus, setNotificationStatus] = useState<string>(() => {
    try { return Notification.permission; }
    catch { return 'unsupported'; }
  });

  useEffect(() => { saveData(data); }, [data]);

  // Restore snoozed wake notifications after a page refresh
  useEffect(() => {
    restoreSnoozedNotifications(data.balls);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 9am / 2pm daily nudge (tab-dependent until backend exists)
  useEffect(() => {
    if (notificationStatus !== 'granted') return;
    const checkNotification = () => {
      const now = new Date();
      const today = getTodayStr();
      const hour = now.getHours();
      const state = loadNotificationState();
      const fired = state.date === today
        ? state
        : { date: today, morning: false, afternoon: false };
      const active = data.balls.filter(b => !isDismissedToday(b));
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
      } catch { /* not supported in this context */ }
    };
    checkNotification();
    const interval = setInterval(checkNotification, 60_000);
    return () => clearInterval(interval);
  }, [notificationStatus, data.balls]);

  const requestNotification = () => {
    try { Notification.requestPermission().then(p => setNotificationStatus(p)); }
    catch { setNotificationStatus('unsupported'); }
  };

  const addBall = (name: string) => {
    setData(d => ({
      ...d,
      balls: [...d.balls, { id: newId(), name, tasks: [], dismissedOn: null, snoozedUntil: null }],
    }));
  };

  const deleteBall = (id: string) => {
    setData(d => ({ ...d, balls: d.balls.filter(b => b.id !== id) }));
  };

  const dismissBall = (id: string) => {
    setData(d => ({
      ...d,
      balls: d.balls.map(b => b.id === id ? { ...b, dismissedOn: getTodayStr() } : b),
    }));
  };

  const undoDismiss = (id: string) => {
    setData(d => ({
      ...d,
      balls: d.balls.map(b => b.id === id ? { ...b, dismissedOn: null, snoozedUntil: null } : b),
    }));
  };

  const snoozeBall = (id: string, ms: number | null) => {
    const until = ms === null
      ? (() => { const d = new Date(); d.setHours(24, 0, 0, 0); return d.getTime(); })()
      : Date.now() + ms;
    setData(d => ({
      ...d,
      balls: d.balls.map(b => b.id === id ? { ...b, snoozedUntil: until, dismissedOn: null } : b),
    }));
    scheduleWakeNotification({ snoozedUntil: until } as Ball);
  };

  const renameBall = (id: string, name: string) => {
    setData(d => ({ ...d, balls: d.balls.map(b => b.id === id ? { ...b, name } : b) }));
  };

  const addTask = (ballId: string, text: string) => {
    setData(d => ({
      ...d,
      balls: d.balls.map(b =>
        b.id === ballId ? { ...b, tasks: [...b.tasks, { id: newId(), text, done: false }] } : b
      ),
    }));
  };

  const toggleTask = (ballId: string, taskId: string) => {
    setData(d => ({
      ...d,
      balls: d.balls.map(b =>
        b.id === ballId
          ? { ...b, tasks: b.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) }
          : b
      ),
    }));
  };

  const deleteTask = (ballId: string, taskId: string) => {
    setData(d => ({
      ...d,
      balls: d.balls.map(b =>
        b.id === ballId ? { ...b, tasks: b.tasks.filter(t => t.id !== taskId) } : b
      ),
    }));
  };

  const editTask = (ballId: string, taskId: string, text: string) => {
    setData(d => ({
      ...d,
      balls: d.balls.map(b =>
        b.id === ballId
          ? { ...b, tasks: b.tasks.map(t => t.id === taskId ? { ...t, text } : t) }
          : b
      ),
    }));
  };

  return {
    data,
    active: data.balls.filter(b => !isDismissedToday(b)),
    done: data.balls.filter(b => isDismissedToday(b)),
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
};
