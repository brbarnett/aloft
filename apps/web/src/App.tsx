import { useState } from 'react';
import { useBalls } from './hooks/useBalls';
import BallCard from './components/BallCard';

const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M8 1.5A4.5 4.5 0 003.5 6v3.5L2 11h12l-1.5-1.5V6A4.5 4.5 0 008 1.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
    <path d="M6.5 11.5a1.5 1.5 0 003 0" stroke="currentColor" strokeWidth="1.5"/>
  </svg>
);

const App = () => {
  const [newName, setNewName] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const {
    data, active, done, notificationStatus, requestNotification,
    addBall, deleteBall, dismissBall, undoDismiss,
    snoozeBall, renameBall, addTask, toggleTask, deleteTask, editTask,
  } = useBalls();

  const handleAddBall = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addBall(newName.trim());
    setNewName('');
    setShowAdd(false);
  };

  return (
    <div className="bg-zinc-950 text-zinc-100 min-h-screen font-sans">
      <div className="max-w-[560px] mx-auto px-5 pt-10 pb-20">

        <div className="flex items-end justify-between mb-9">
          <div>
            <h1 className="font-mono text-[28px] font-medium tracking-tight">aloft</h1>
            <div className="text-xs text-zinc-600 font-mono mt-0.5">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
            </div>
          </div>
          <div className="flex gap-2 items-center">
            <span className="font-mono text-[13px] text-zinc-500">
              <span className="text-lime-300">{done.length}</span>/{data.balls.length}
            </span>
            {notificationStatus !== 'unsupported' && (
              <button
                className={`bg-zinc-900 border border-zinc-800 px-2.5 py-1.5 rounded-md cursor-pointer text-xs flex items-center gap-1.5 transition-all hover:border-zinc-700 ${
                  notificationStatus === 'granted' ? 'text-lime-300' : 'text-zinc-500 hover:text-zinc-400'
                }`}
                onClick={requestNotification}
                title="Enable daily notifications"
              >
                <IconBell />
                {notificationStatus === 'granted' ? 'on' : 'notify'}
              </button>
            )}
          </div>
        </div>

        {active.length > 0 && (
          <>
            <div className="font-mono text-[10px] tracking-[2px] uppercase text-zinc-600 mb-2.5 mt-7">
              in the air
            </div>
            {active.map(ball => (
              <BallCard key={ball.id} ball={ball}
                onDismiss={dismissBall} onUndoDismiss={undoDismiss} onSnooze={snoozeBall}
                onAddTask={addTask} onToggleTask={toggleTask} onDeleteTask={deleteTask}
                onDelete={deleteBall} onRenameBall={renameBall} onEditTask={editTask}
              />
            ))}
          </>
        )}

        {done.length > 0 && (
          <>
            {done.length === data.balls.length && (
              <div className="bg-lime-950 border border-lime-900 rounded-xl px-5 py-4 text-center text-[13px] text-lime-300 font-mono mb-2">
                ✓ all balls landed for today
              </div>
            )}
            <div className="font-mono text-[10px] tracking-[2px] uppercase text-zinc-600 mb-2.5 mt-7">
              done today
            </div>
            {done.map(ball => (
              <BallCard key={ball.id} ball={ball}
                onDismiss={dismissBall} onUndoDismiss={undoDismiss} onSnooze={snoozeBall}
                onAddTask={addTask} onToggleTask={toggleTask} onDeleteTask={deleteTask}
                onDelete={deleteBall} onRenameBall={renameBall} onEditTask={editTask}
              />
            ))}
          </>
        )}

        {data.balls.length === 0 && (
          <div className="text-center py-10 text-zinc-700 text-[13px] font-mono">
            no balls yet — add one below
          </div>
        )}

        <div className="mt-7">
          {showAdd ? (
            <form className="flex gap-2" onSubmit={handleAddBall}>
              <input
                className="bg-zinc-900 border border-zinc-800 rounded-lg text-zinc-100 text-[15px] font-medium px-3.5 py-3 flex-1 outline-none transition-colors focus:border-zinc-700 placeholder:text-zinc-700"
                placeholder="Ball name..."
                value={newName}
                autoFocus
                onChange={e => setNewName(e.target.value)}
              />
              <button
                type="button"
                className="bg-transparent border border-zinc-800 text-zinc-500 text-[13px] px-3.5 py-3 rounded-lg cursor-pointer transition-all hover:text-zinc-300 hover:border-zinc-700"
                onClick={() => { setShowAdd(false); setNewName(''); }}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-lime-300 text-zinc-950 text-[13px] font-semibold px-[18px] py-3 rounded-lg cursor-pointer transition-all hover:bg-lime-200 disabled:opacity-30 disabled:cursor-default whitespace-nowrap"
                disabled={!newName.trim()}
              >
                Add
              </button>
            </form>
          ) : (
            <button
              className="bg-transparent border border-dashed border-zinc-800 text-zinc-600 text-[13px] py-3 px-4 rounded-xl cursor-pointer w-full flex items-center gap-2 transition-all hover:border-zinc-700 hover:text-zinc-500"
              onClick={() => setShowAdd(true)}
            >
              <IconPlus /> Add ball
            </button>
          )}
        </div>

      </div>
    </div>
  );
};

export default App;
