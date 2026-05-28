import { useState, useEffect } from 'react';
import clsx from 'clsx';
import type { Ball, Task } from '@aloft/types';
import { isDismissedToday, isSnoozed, snoozeLabel } from '../../hooks/useBalls';
import {
  IconCheck, IconPlus, IconTrash, IconSnooze,
  IconBell, IconChevron, IconUndo, IconEdit,
} from './icons';

const SNOOZE_OPTIONS: { label: string; ms: number | null }[] = [
  { label: '20 min', ms: 20 * 60 * 1000 },
  { label: '1 hr',  ms: 60 * 60 * 1000 },
  { label: '2 hr',  ms: 2 * 60 * 60 * 1000 },
  { label: 'Tomorrow', ms: null },
];

interface Props {
  ball: Ball;
  onDismiss: (id: string) => void;
  onUndoDismiss: (id: string) => void;
  onSnooze: (id: string, ms: number | null) => void;
  onAddTask: (ballId: string, text: string) => void;
  onToggleTask: (ballId: string, taskId: string) => void;
  onDeleteTask: (ballId: string, taskId: string) => void;
  onDelete: (id: string) => void;
  onRenameBall: (id: string, name: string) => void;
  onEditTask: (ballId: string, taskId: string, text: string) => void;
}

const BallCard = ({
  ball, onDismiss, onUndoDismiss, onSnooze,
  onAddTask, onToggleTask, onDeleteTask, onDelete,
  onRenameBall, onEditTask,
}: Props) => {
  const [expanded, setExpanded] = useState(false);
  const [taskInput, setTaskInput] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameVal, setNameVal] = useState(ball.name);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [editingTaskVal, setEditingTaskVal] = useState('');
  const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);
  const [, forceUpdate] = useState(0);

  // Re-render every 30s to keep snooze countdown accurate
  useEffect(() => {
    const t = setInterval(() => forceUpdate(n => n + 1), 30_000);
    return () => clearInterval(t);
  }, []);

  const dismissed = isDismissedToday(ball);
  const snoozed = isSnoozed(ball);
  const doneTasks = ball.tasks.filter(t => t.done);

  const cardClass = clsx(
    'rounded-xl mb-2 transition-all',
    snoozed  && 'bg-zinc-900/70 border border-zinc-800/60 opacity-75',
    dismissed && !snoozed && 'bg-zinc-950 border border-zinc-900 opacity-60',
    !dismissed && !snoozed && 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700',
  );

  const dotClass = clsx(
    'w-2 h-2 rounded-full shrink-0',
    snoozed  && 'bg-violet-400 shadow-[0_0_8px_#7c3aed44]',
    dismissed && !snoozed && 'bg-zinc-700',
    !dismissed && !snoozed && 'bg-lime-300 shadow-[0_0_8px_#bef26444]',
  );

  const commitRename = () => {
    const v = nameVal.trim();
    if (v && v !== ball.name) onRenameBall(ball.id, v);
    else setNameVal(ball.name);
    setEditingName(false);
  };

  const startEditTask = (task: Task) => {
    setEditingTaskId(task.id);
    setEditingTaskVal(task.text);
  };

  const commitEditTask = () => {
    const v = editingTaskVal.trim();
    if (v && editingTaskId) onEditTask(ball.id, editingTaskId, v);
    setEditingTaskId(null);
    setEditingTaskVal('');
  };

  const handleAddTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (taskInput.trim()) { onAddTask(ball.id, taskInput.trim()); setTaskInput(''); }
  };

  return (
    <div className={cardClass}>
      <div
        className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none"
        onClick={() => !editingName && setExpanded(e => !e)}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={dotClass} />
          {editingName ? (
            <input
              className="bg-zinc-950 border border-zinc-700 rounded text-zinc-100 text-[15px] font-medium px-2 py-0.5 outline-none flex-1 min-w-0"
              value={nameVal}
              autoFocus
              onChange={e => setNameVal(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => {
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') { setNameVal(ball.name); setEditingName(false); }
              }}
              onClick={e => e.stopPropagation()}
            />
          ) : (
            <span className={clsx('text-[15px] font-medium truncate', dismissed ? 'text-zinc-600' : 'text-zinc-300')}>
              {ball.name}
            </span>
          )}
          {ball.tasks.length > 0 && (
            <span className="font-mono text-[11px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded-full shrink-0">
              {doneTasks.length}/{ball.tasks.length}
            </span>
          )}
          {snoozed && (
            <span className="font-mono text-[11px] bg-violet-950 text-violet-400 px-1.5 py-0.5 rounded-full shrink-0">
              ⏱ {snoozeLabel(ball)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            className="bg-transparent border-none cursor-pointer text-zinc-600 p-1 rounded flex items-center transition-colors hover:text-zinc-400"
            onClick={e => { e.stopPropagation(); setEditingName(true); setExpanded(true); }}
            title="Rename"
          >
            <IconEdit />
          </button>
          <button
            className="bg-transparent border-none cursor-pointer text-zinc-600 p-1 rounded flex items-center transition-colors hover:text-red-400"
            onClick={e => { e.stopPropagation(); onDelete(ball.id); }}
            title="Delete"
          >
            <IconTrash />
          </button>
          <IconChevron open={expanded} />
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 border-t border-zinc-800/50">
          {ball.tasks.length > 0 && (
            <div className="pt-3 flex flex-col gap-1.5">
              {ball.tasks.map(task => (
                <div key={task.id} className="flex items-center gap-2">
                  <button
                    className={clsx(
                      'w-[18px] h-[18px] rounded border bg-transparent cursor-pointer flex items-center justify-center shrink-0 transition-all',
                      task.done
                        ? 'bg-lime-300 border-lime-300 text-zinc-950'
                        : 'border-zinc-700 text-transparent hover:border-lime-300',
                    )}
                    onClick={() => onToggleTask(ball.id, task.id)}
                  >
                    {task.done && <IconCheck />}
                  </button>
                  {editingTaskId === task.id ? (
                    <input
                      className="bg-zinc-950 border border-zinc-800 rounded-md text-zinc-400 text-[13px] px-2.5 py-1.5 flex-1 outline-none focus:border-zinc-700"
                      value={editingTaskVal}
                      autoFocus
                      onChange={e => setEditingTaskVal(e.target.value)}
                      onBlur={commitEditTask}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitEditTask();
                        if (e.key === 'Escape') setEditingTaskId(null);
                      }}
                    />
                  ) : (
                    <span
                      className={clsx('text-[13px] flex-1', task.done ? 'line-through text-zinc-600' : 'text-zinc-400')}
                      onDoubleClick={() => !task.done && startEditTask(task)}
                    >
                      {task.text}
                    </span>
                  )}
                  {editingTaskId !== task.id && (
                    <>
                      {!task.done && (
                        <button
                          className="bg-transparent border-none cursor-pointer text-zinc-600 p-1 rounded flex items-center transition-colors hover:text-zinc-400"
                          onClick={() => startEditTask(task)}
                          title="Edit"
                        >
                          <IconEdit />
                        </button>
                      )}
                      <button
                        className="bg-transparent border-none cursor-pointer text-zinc-600 p-1 rounded flex items-center transition-colors hover:text-red-400"
                        onClick={() => onDeleteTask(ball.id, task.id)}
                      >
                        <IconTrash />
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <form className="flex items-center gap-1.5 mt-2.5" onSubmit={handleAddTask}>
            <input
              className="bg-zinc-950 border border-zinc-800 rounded-md text-zinc-400 text-[13px] px-2.5 py-1.5 flex-1 outline-none transition-colors focus:border-zinc-700 placeholder:text-zinc-700"
              placeholder="Add a task..."
              value={taskInput}
              onChange={e => setTaskInput(e.target.value)}
            />
            <button
              type="submit"
              className="bg-transparent border-none cursor-pointer text-zinc-500 p-1 rounded flex items-center transition-colors disabled:opacity-30 disabled:cursor-default enabled:hover:text-lime-300"
              disabled={!taskInput.trim()}
            >
              <IconPlus />
            </button>
          </form>

          {!dismissed && (
            <div className="mt-3 flex gap-2 items-center flex-wrap">
              <button
                className="bg-lime-950 border border-lime-900 text-lime-300 text-xs font-medium px-3.5 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-all hover:bg-lime-900"
                onClick={() => onDismiss(ball.id)}
              >
                <IconSnooze /> Done for today
              </button>
              <div className="relative">
                <button
                  className="bg-violet-950 border border-violet-900 text-violet-400 text-xs font-medium px-3.5 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-all hover:bg-violet-900"
                  onClick={() => setShowSnoozeMenu(v => !v)}
                >
                  <IconBell /> Snooze
                </button>
                {showSnoozeMenu && (
                  <div className="absolute top-[calc(100%+6px)] left-0 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden z-[100] min-w-[110px] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                    {SNOOZE_OPTIONS.map(opt => (
                      <button
                        key={opt.label}
                        className="block w-full bg-transparent border-none text-zinc-400 text-[13px] px-3.5 py-2.5 text-left cursor-pointer transition-colors hover:bg-zinc-800 hover:text-violet-400"
                        onClick={() => { onSnooze(ball.id, opt.ms); setShowSnoozeMenu(false); }}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {snoozed && (
            <div className="mt-3 flex items-center text-xs">
              <span className="text-zinc-700">Snoozed for {snoozeLabel(ball)}</span>
              <button
                className="bg-transparent border border-zinc-800 text-zinc-500 text-[11px] px-2.5 py-1 rounded cursor-pointer inline-flex items-center gap-1.5 ml-2.5 transition-all hover:text-lime-300 hover:border-lime-900"
                onClick={() => onUndoDismiss(ball.id)}
              >
                <IconUndo /> Wake
              </button>
            </div>
          )}

          {dismissed && !snoozed && (
            <div className="mt-3 flex items-center text-xs">
              <span className="text-zinc-700">Dismissed — see you tomorrow</span>
              <button
                className="bg-transparent border border-zinc-800 text-zinc-500 text-[11px] px-2.5 py-1 rounded cursor-pointer inline-flex items-center gap-1.5 ml-2.5 transition-all hover:text-lime-300 hover:border-lime-900"
                onClick={() => onUndoDismiss(ball.id)}
              >
                <IconUndo /> Undo
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BallCard;
