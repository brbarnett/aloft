import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = "aloft_v1";
const NOTIF_KEY = "aloft_notif_fired";
function getNotifState() {
  try { return JSON.parse(localStorage.getItem(NOTIF_KEY)) || {}; } catch { return {}; }
}
function saveNotifState(s) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(s));
}

function getTodayStr() {
  return new Date().toISOString().split("T")[0];
}

function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || { plates: [] };
  } catch {
    return { plates: [] };
  }
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function isDismissedToday(plate) {
  if (plate.dismissedOn === getTodayStr()) return true;
  if (plate.snoozedUntil && Date.now() < plate.snoozedUntil) return true;
  return false;
}

function isSnoozed(plate) {
  return plate.snoozedUntil && Date.now() < plate.snoozedUntil;
}

function snoozeLabel(plate) {
  if (!plate.snoozedUntil) return "";
  const diff = plate.snoozedUntil - Date.now();
  if (diff <= 0) return "";
  const mins = Math.ceil(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hrs = Math.ceil(diff / 3600000);
  return `${hrs}h`;
}

let idCounter = Date.now();
function newId() {
  return String(++idCounter);
}

// ── Icons ──────────────────────────────────────────────────────────────────
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconTrash = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconSnooze = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5"/>
    <path d="M8 5.5v3l2 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    <path d="M5.5 1.5l-2 2M10.5 1.5l2 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5A4.5 4.5 0 003.5 6v3.5L2 11h12l-1.5-1.5V6A4.5 4.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);
const IconChevron = ({ open }) => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s" }}>
    <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const IconUndo = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M3 7V3L1 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    <path d="M3 5a6 6 0 106 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
  </svg>
);
const IconEdit = () => (
  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
    <path d="M11 2l3 3-8 8H3v-3l8-8z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

// ── PlateCard ──────────────────────────────────────────────────────────────
function PlateCard({ plate, onDismiss, onUndoDismiss, onSnooze, onAddTask, onToggleTask, onDeleteTask, onDelete, onRenamePlate, onEditTask }) {
  const [expanded, setExpanded] = useState(false);
  const [taskInput, setTaskInput] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(plate.name);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [editingTaskVal, setEditingTaskVal] = useState("");
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [, forceUpdate] = useState(0);
  // re-render every 30s so snooze countdown stays accurate
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  const dismissed = isDismissedToday(plate);
  const snoozed = isSnoozed(plate);
  const doneTasks = plate.tasks.filter(t => t.done);

  const SNOOZE_OPTIONS = [
    { label: "20 min", ms: 20 * 60 * 1000 },
    { label: "1 hr",  ms: 60 * 60 * 1000 },
    { label: "2 hr",  ms: 2 * 60 * 60 * 1000 },
    { label: "Tomorrow", ms: null },
  ];

  function handleAddTask(e) {
    e.preventDefault();
    if (taskInput.trim()) {
      onAddTask(plate.id, taskInput.trim());
      setTaskInput("");
    }
  }

  function commitRename() {
    const v = nameVal.trim();
    if (v && v !== plate.name) onRenamePlate(plate.id, v);
    else setNameVal(plate.name);
    setEditingName(false);
  }

  function startEditTask(task) {
    setEditingTaskId(task.id);
    setEditingTaskVal(task.text);
  }

  function commitEditTask() {
    const v = editingTaskVal.trim();
    if (v) onEditTask(plate.id, editingTaskId, v);
    setEditingTaskId(null);
    setEditingTaskVal("");
  }

  return (
    <div className={`plate-card ${dismissed ? (snoozed ? "plate-snoozed" : "plate-dismissed") : "plate-active"}`}>
      <div className="plate-header" onClick={() => !editingName && setExpanded(e => !e)}>
        <div className="plate-header-left">
          <div className={`plate-dot ${snoozed ? "dot-snoozed" : dismissed ? "dot-done" : "dot-pending"}`} />
          {editingName ? (
            <input
              className="inline-edit-input"
              value={nameVal}
              autoFocus
              onChange={e => setNameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") { setNameVal(plate.name); setEditingName(false); } }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className="plate-name">{plate.name}</span>
          )}
          {plate.tasks.length > 0 && (
            <span className="task-badge">{doneTasks.length}/{plate.tasks.length}</span>
          )}
          {snoozed && (
            <span className="snooze-badge">⏱ {snoozeLabel(plate)}</span>
          )}
        </div>
        <div className="plate-header-right">
          <button className="icon-btn edit-btn" onClick={e => { e.stopPropagation(); setEditingName(true); setExpanded(true); }} title="Rename">
            <IconEdit />
          </button>
          <button className="icon-btn delete-btn" onClick={e => { e.stopPropagation(); onDelete(plate.id); }} title="Delete">
            <IconTrash />
          </button>
          <IconChevron open={expanded} />
        </div>
      </div>

      {expanded && (
        <div className="plate-body">
          {plate.tasks.length > 0 && (
            <div className="task-list">
              {plate.tasks.map(task => (
                <div key={task.id} className={`task-row ${task.done ? "task-done" : ""}`}>
                  <button className={`task-check ${task.done ? "checked" : ""}`} onClick={() => onToggleTask(plate.id, task.id)}>
                    {task.done && <IconCheck />}
                  </button>
                  {editingTaskId === task.id ? (
                    <input
                      className="task-input"
                      value={editingTaskVal}
                      autoFocus
                      onChange={e => setEditingTaskVal(e.target.value)}
                      onBlur={commitEditTask}
                      onKeyDown={e => { if (e.key === "Enter") commitEditTask(); if (e.key === "Escape") setEditingTaskId(null); }}
                    />
                  ) : (
                    <span className="task-label" onDoubleClick={() => !task.done && startEditTask(task)}>{task.text}</span>
                  )}
                  {editingTaskId !== task.id && (
                    <>
                      {!task.done && <button className="icon-btn" onClick={() => startEditTask(task)} title="Edit"><IconEdit /></button>}
                      <button className="icon-btn" onClick={() => onDeleteTask(plate.id, task.id)}><IconTrash /></button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <form className="add-task-form" onSubmit={handleAddTask}>
            <input
              className="task-input"
              placeholder="Add a task..."
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
            />
            <button type="submit" className="icon-btn add-task-btn" disabled={!taskInput.trim()}>
              <IconPlus />
            </button>
          </form>

          {!dismissed && (
            <div className="dismiss-section">
              <div className="action-row">
                <button className="dismiss-btn" onClick={() => onDismiss(plate.id)}>
                  <IconSnooze /> Done for today
                </button>
                <div className="snooze-wrap">
                  <button className="snooze-trigger-btn" onClick={() => setShowSnoozeMenu(v => !v)}>
                    <IconBell /> Snooze
                  </button>
                  {showSnoozeMenu && (
                    <div className="snooze-menu">
                      {SNOOZE_OPTIONS.map(opt => (
                        <button key={opt.label} className="snooze-option" onClick={() => {
                          onSnooze(plate.id, opt.ms);
                          setShowSnoozeMenu(false);
                        }}>
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {snoozed && (
            <div className="dismissed-note">
              <span className="note-label">Snoozed for {snoozeLabel(plate)}</span>
              <button className="undo-btn" onClick={() => onUndoDismiss(plate.id)}>
                <IconUndo /> Wake
              </button>
            </div>
          )}

          {dismissed && !snoozed && (
            <div className="dismissed-note">
              <span className="note-label">Dismissed — see you tomorrow</span>
              <button className="undo-btn" onClick={() => onUndoDismiss(plate.id)}>
                <IconUndo /> Undo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────────────
export default function App() {
  const [data, setData] = useState(loadData);
  const [newName, setNewName] = useState("");
  const [notifStatus, setNotifStatus] = useState(() => {
    try { return Notification?.permission ?? "default"; } catch { return "unsupported"; }
  });
  const [showAdd, setShowAdd] = useState(false);

  // Persist
  useEffect(() => { saveData(data); }, [data]);

  // Notifications at 9am and 2pm if any plates are still active
  useEffect(() => {
    if (notifStatus !== "granted") return;
    function checkNotif() {
      const now = new Date();
      const today = getTodayStr();
      const hour = now.getHours();
      const state = getNotifState();
      const fired = state.date === today ? state : { date: today, morning: false, afternoon: false };
      const active = data.plates.filter(p => !isDismissedToday(p));
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
      saveNotifState(updated);
      try {
        new Notification("Aloft", {
          body: `${active.length} plate${active.length > 1 ? "s" : ""} still need attention.`,
          icon: "/favicon.ico",
        });
      } catch { /* not supported */ }
    }
    checkNotif();
    const interval = setInterval(checkNotif, 60 * 1000);
    return () => clearInterval(interval);
  }, [notifStatus, data.plates]);

  function requestNotif() {
    try { Notification.requestPermission().then(p => setNotifStatus(p)); } catch { setNotifStatus("unsupported"); }
  }

  function addPlate(e) {
    e.preventDefault();
    if (!newName.trim()) return;
    setData(d => ({
      ...d,
      plates: [...d.plates, { id: newId(), name: newName.trim(), tasks: [], dismissedOn: null }]
    }));
    setNewName("");
    setShowAdd(false);
  }

  function deletePlate(id) {
    setData(d => ({ ...d, plates: d.plates.filter(p => p.id !== id) }));
  }

  function dismissPlate(id) {
    setData(d => ({
      ...d,
      plates: d.plates.map(p => p.id === id ? { ...p, dismissedOn: getTodayStr() } : p)
    }));
  }

  function renamePlate(id, name) {
    setData(d => ({ ...d, plates: d.plates.map(p => p.id === id ? { ...p, name } : p) }));
  }

  function undoDismiss(id) {
    setData(d => ({ ...d, plates: d.plates.map(p => p.id === id ? { ...p, dismissedOn: null } : p) }));
  }

  function snoozePlate(id, ms) {
    const until = ms === null
      ? (() => { const d = new Date(); d.setHours(24,0,0,0); return d.getTime(); })()
      : Date.now() + ms;
    setData(d => ({
      ...d,
      plates: d.plates.map(p => p.id === id ? { ...p, snoozedUntil: until, dismissedOn: null } : p)
    }));
    // Schedule wake notification
    const remaining = until - Date.now();
    setTimeout(() => {
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification("Aloft", { body: `Time to check back in.` });
        }
      } catch {}
    }, remaining);
  }

  function editTask(plateId, taskId, text) {
    setData(d => ({
      ...d,
      plates: d.plates.map(p => p.id === plateId
        ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, text } : t) }
        : p
      )
    }));
  }

  function addTask(plateId, text) {
    setData(d => ({
      ...d,
      plates: d.plates.map(p => p.id === plateId ? { ...p, tasks: [...p.tasks, { id: newId(), text, done: false }] } : p)
    }));
  }

  function toggleTask(plateId, taskId) {
    setData(d => ({
      ...d,
      plates: d.plates.map(p => p.id === plateId
        ? { ...p, tasks: p.tasks.map(t => t.id === taskId ? { ...t, done: !t.done } : t) }
        : p
      )
    }));
  }

  function deleteTask(plateId, taskId) {
    setData(d => ({
      ...d,
      plates: d.plates.map(p => p.id === plateId
        ? { ...p, tasks: p.tasks.filter(t => t.id !== taskId) }
        : p
      )
    }));
  }

  const today = getTodayStr();
  const active = data.plates.filter(p => !isDismissedToday(p));
  const done = data.plates.filter(p => isDismissedToday(p));

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=DM+Sans:wght@300;400;500;600&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0f0f0f;
          color: #e8e4dc;
          font-family: 'DM Sans', sans-serif;
          min-height: 100vh;
        }

        .app {
          max-width: 560px;
          margin: 0 auto;
          padding: 40px 20px 80px;
        }

        .header {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          margin-bottom: 36px;
        }

        .header-left h1 {
          font-family: 'DM Mono', monospace;
          font-size: 28px;
          font-weight: 500;
          letter-spacing: -0.5px;
          color: #e8e4dc;
        }

        .header-left .date {
          font-size: 12px;
          color: #555;
          font-family: 'DM Mono', monospace;
          margin-top: 2px;
        }

        .header-right {
          display: flex;
          gap: 8px;
          align-items: center;
        }

        .progress-text {
          font-family: 'DM Mono', monospace;
          font-size: 13px;
          color: #555;
        }
        .progress-text span {
          color: #c8f5a0;
        }

        .notif-btn {
          background: #1a1a1a;
          border: 1px solid #2a2a2a;
          color: #666;
          padding: 6px 10px;
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 5px;
          transition: all 0.15s;
        }
        .notif-btn:hover { border-color: #444; color: #999; }
        .notif-btn.granted { color: #c8f5a0; border-color: #2a3a1a; }

        /* Section labels */
        .section-label {
          font-family: 'DM Mono', monospace;
          font-size: 10px;
          letter-spacing: 2px;
          text-transform: uppercase;
          color: #444;
          margin-bottom: 10px;
          margin-top: 28px;
        }

        /* Plate cards */
        .plate-card {
          border-radius: 10px;
          margin-bottom: 8px;
          overflow: visible;
          transition: all 0.2s;
        }

        .plate-active {
          background: #181818;
          border: 1px solid #2c2c2c;
        }
        .plate-active:hover {
          border-color: #3a3a3a;
        }

        .plate-dismissed {
          background: #111;
          border: 1px solid #1e1e1e;
          opacity: 0.6;
        }

        .plate-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 16px;
          cursor: pointer;
          user-select: none;
        }

        .plate-header-left {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
        }

        .plate-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          flex-shrink: 0;
        }
        .dot-pending { background: #c8f5a0; box-shadow: 0 0 8px #c8f5a044; }
        .dot-done { background: #333; }

        .plate-name {
          font-size: 15px;
          font-weight: 500;
          color: #ddd;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .plate-dismissed .plate-name { color: #555; }

        .task-badge {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          background: #222;
          color: #666;
          padding: 2px 7px;
          border-radius: 20px;
          flex-shrink: 0;
        }

        .plate-header-right {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-shrink: 0;
        }

        .dismiss-note-preview {
          font-size: 12px;
          color: #444;
          font-style: italic;
          max-width: 120px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .icon-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #444;
          padding: 4px;
          border-radius: 4px;
          display: flex;
          align-items: center;
          transition: color 0.15s;
          line-height: 0;
        }
        .icon-btn:hover { color: #888; }
        .delete-btn:hover { color: #e05555; }
        .add-task-btn { color: #555; }
        .add-task-btn:not(:disabled):hover { color: #c8f5a0; }
        .add-task-btn:disabled { opacity: 0.3; cursor: default; }

        /* Plate body */
        .plate-body {
          padding: 0 16px 16px;
          border-top: 1px solid #202020;
          overflow: visible;
        }

        /* Tasks */
        .task-list {
          padding-top: 12px;
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .task-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .task-check {
          width: 18px;
          height: 18px;
          border-radius: 4px;
          border: 1.5px solid #333;
          background: none;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          color: #0f0f0f;
          transition: all 0.15s;
        }
        .task-check:hover { border-color: #c8f5a0; }
        .task-check.checked { background: #c8f5a0; border-color: #c8f5a0; }

        .task-label {
          font-size: 13px;
          color: #bbb;
          flex: 1;
        }
        .task-done .task-label {
          text-decoration: line-through;
          color: #444;
        }

        .add-task-form {
          display: flex;
          align-items: center;
          gap: 6px;
          margin-top: 10px;
        }

        .task-input, .note-input {
          background: #111;
          border: 1px solid #252525;
          border-radius: 6px;
          color: #ccc;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          padding: 7px 10px;
          flex: 1;
          outline: none;
          transition: border-color 0.15s;
        }
        .task-input:focus, .note-input:focus { border-color: #3a3a3a; }
        .task-input::placeholder, .note-input::placeholder { color: #3a3a3a; }

        /* Dismiss */
        .dismiss-section { margin-top: 12px; }

        .note-row, .dismiss-row {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .dismiss-btn {
          background: #1e2a14;
          border: 1px solid #2d3d1a;
          color: #c8f5a0;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          padding: 7px 14px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .dismiss-btn:hover { background: #253316; border-color: #3a4f22; }

        .dismissed-note {
          margin-top: 12px;
          font-size: 12px;
          color: #444;
          font-style: italic;
        }
        .note-label { color: #3a3a3a; font-style: normal; }

        /* Add plate */
        .add-plate-area { margin-top: 28px; }

        .add-plate-btn {
          background: none;
          border: 1px dashed #2a2a2a;
          color: #444;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          padding: 12px 16px;
          border-radius: 10px;
          cursor: pointer;
          width: 100%;
          display: flex;
          align-items: center;
          gap: 8px;
          transition: all 0.15s;
        }
        .add-plate-btn:hover { border-color: #3a3a3a; color: #666; }

        .add-plate-form {
          display: flex;
          gap: 8px;
        }

        .plate-name-input {
          background: #181818;
          border: 1px solid #2c2c2c;
          border-radius: 8px;
          color: #e8e4dc;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          padding: 12px 14px;
          flex: 1;
          outline: none;
          transition: border-color 0.15s;
        }
        .plate-name-input:focus { border-color: #3a3a3a; }
        .plate-name-input::placeholder { color: #333; }

        .create-btn {
          background: #c8f5a0;
          border: none;
          color: #0f0f0f;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          font-weight: 600;
          padding: 12px 18px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .create-btn:hover { background: #d8ffb0; }
        .create-btn:disabled { opacity: 0.3; cursor: default; }

        .cancel-btn {
          background: none;
          border: 1px solid #2a2a2a;
          color: #555;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          padding: 12px 14px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .cancel-btn:hover { color: #888; border-color: #3a3a3a; }

        .empty-state {
          text-align: center;
          padding: 40px 0;
          color: #333;
          font-size: 13px;
          font-family: 'DM Mono', monospace;
        }

        .inline-edit-input {
          background: #111;
          border: 1px solid #3a3a3a;
          border-radius: 4px;
          color: #e8e4dc;
          font-family: 'DM Sans', sans-serif;
          font-size: 15px;
          font-weight: 500;
          padding: 2px 8px;
          outline: none;
          flex: 1;
          min-width: 0;
        }

        .edit-btn:hover { color: #aaa; }

        .undo-btn {
          background: none;
          border: 1px solid #2a2a2a;
          color: #555;
          font-family: 'DM Sans', sans-serif;
          font-size: 11px;
          padding: 4px 10px;
          border-radius: 5px;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 5px;
          margin-left: 10px;
          transition: all 0.15s;
        }
        .undo-btn:hover { color: #c8f5a0; border-color: #3a4f22; }

        .plate-snoozed {
          background: #141418;
          border: 1px solid #252530;
          opacity: 0.75;
        }

        .dot-snoozed { background: #7a6fff; box-shadow: 0 0 8px #7a6fff44; }

        .snooze-badge {
          font-family: 'DM Mono', monospace;
          font-size: 11px;
          background: #1a1830;
          color: #7a6fff;
          padding: 2px 7px;
          border-radius: 20px;
          flex-shrink: 0;
        }

        .action-row {
          display: flex;
          gap: 8px;
          align-items: center;
          flex-wrap: wrap;
        }

        .snooze-wrap { position: relative; }

        .snooze-trigger-btn {
          background: #1a1830;
          border: 1px solid #2d2a50;
          color: #7a6fff;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px;
          font-weight: 500;
          padding: 7px 14px;
          border-radius: 6px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
          transition: all 0.15s;
        }
        .snooze-trigger-btn:hover { background: #201e40; border-color: #3d3a6f; }

        .snooze-menu {
          position: absolute;
          top: calc(100% + 6px);
          left: 0;
          background: #1a1a1a;
          border: 1px solid #2c2c2c;
          border-radius: 8px;
          overflow: hidden;
          z-index: 100;
          min-width: 110px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.5);
        }

        .snooze-option {
          display: block;
          width: 100%;
          background: none;
          border: none;
          color: #bbb;
          font-family: 'DM Sans', sans-serif;
          font-size: 13px;
          padding: 10px 14px;
          text-align: left;
          cursor: pointer;
          transition: background 0.1s;
        }
        .snooze-option:hover { background: #252525; color: #7a6fff; }

        .all-done-banner {
          background: #141f0a;
          border: 1px solid #2a3d14;
          border-radius: 10px;
          padding: 16px 20px;
          text-align: center;
          font-size: 13px;
          color: #c8f5a0;
          font-family: 'DM Mono', monospace;
          margin-bottom: 8px;
        }
      `}</style>

      <div className="app">
        <div className="header">
          <div className="header-left">
            <h1>aloft</h1>
            <div className="date">{new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" })}</div>
          </div>
          <div className="header-right">
            <span className="progress-text">
              <span>{done.length}</span>/{data.plates.length}
            </span>
            {notifStatus !== "unsupported" && (
            <button
              className={`notif-btn ${notifStatus === "granted" ? "granted" : ""}`}
              onClick={requestNotif}
              title="Enable daily notifications"
            >
              <IconBell />
              {notifStatus === "granted" ? "on" : "notify"}
            </button>
            )}
          </div>
        </div>

        {/* Active plates */}
        {active.length > 0 && (
          <>
            <div className="section-label">needs attention</div>
            {active.map(plate => (
              <PlateCard
                key={plate.id}
                plate={plate}
                onDismiss={dismissPlate}
                onUndoDismiss={undoDismiss}
                onSnooze={snoozePlate}
                onAddTask={addTask}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
                onDelete={deletePlate}
                onRenamePlate={renamePlate}
                onEditTask={editTask}
              />
            ))}
          </>
        )}

        {/* Done plates */}
        {done.length > 0 && (
          <>
            {done.length === data.plates.length && active.length === 0 && (
              <div className="all-done-banner">✓ all plates spun for today</div>
            )}
            <div className="section-label">done today</div>
            {done.map(plate => (
              <PlateCard
                key={plate.id}
                plate={plate}
                onDismiss={dismissPlate}
                onUndoDismiss={undoDismiss}
                onSnooze={snoozePlate}
                onAddTask={addTask}
                onToggleTask={toggleTask}
                onDeleteTask={deleteTask}
                onDelete={deletePlate}
                onRenamePlate={renamePlate}
                onEditTask={editTask}
              />
            ))}
          </>
        )}

        {data.plates.length === 0 && (
          <div className="empty-state">no plates yet — add one below</div>
        )}

        {/* Add plate */}
        <div className="add-plate-area">
          {showAdd ? (
            <form className="add-plate-form" onSubmit={addPlate}>
              <input
                className="plate-name-input"
                placeholder="Plate name..."
                value={newName}
                autoFocus
                onChange={e => setNewName(e.target.value)}
              />
              <button type="button" className="cancel-btn" onClick={() => { setShowAdd(false); setNewName(""); }}>Cancel</button>
              <button type="submit" className="create-btn" disabled={!newName.trim()}>Add</button>
            </form>
          ) : (
            <button className="add-plate-btn" onClick={() => setShowAdd(true)}>
              <IconPlus /> Add plate
            </button>
          )}
        </div>
      </div>
    </>
  );
}
