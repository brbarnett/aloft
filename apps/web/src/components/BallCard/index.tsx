import { useEffect, useState } from 'react';
import type { Ball } from '@aloft/types';
import clsx from 'clsx';
import { isDismissedToday, isSnoozed, snoozeLabel, useBalls } from '../../hooks/useBalls';
import BallCardActions from './BallCardActions';
import TaskList from './TaskList';
import { IconChevron, IconEdit, IconTrash } from './icons';

interface Props {
    ball: Ball;
}

const BallCard = ({ ball }: Props) => {
    const { renameBall, deleteBall } = useBalls();

    const [expanded, setExpanded] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameVal, setNameVal] = useState(ball.name);
    const [, forceUpdate] = useState(0);

    // Re-render every 30s to keep snooze countdown accurate
    useEffect(() => {
        const t = setInterval(() => forceUpdate((n) => n + 1), 30_000);
        return () => clearInterval(t);
    }, []);

    const dismissed = isDismissedToday(ball);
    const snoozed = isSnoozed(ball);
    const doneTasks = ball.tasks.filter((t) => t.done);

    const cardClass = clsx(
        'rounded-xl mb-2 transition-all',
        snoozed && 'bg-zinc-900/70 border border-zinc-800/60 opacity-75',
        dismissed && !snoozed && 'bg-zinc-950 border border-zinc-900 opacity-60',
        !dismissed && !snoozed && 'bg-zinc-900 border border-zinc-800 hover:border-zinc-700',
    );

    const dotClass = clsx(
        'w-2 h-2 rounded-full shrink-0',
        snoozed && 'bg-violet-400 shadow-[0_0_8px_#7c3aed44]',
        dismissed && !snoozed && 'bg-zinc-700',
        !dismissed && !snoozed && 'bg-lime-300 shadow-[0_0_8px_#bef26444]',
    );

    const commitRename = () => {
        const v = nameVal.trim();
        if (v && v !== ball.name) renameBall(ball.id, v);
        else setNameVal(ball.name);
        setEditingName(false);
    };

    return (
        <div className={cardClass}>
            <div
                className="flex items-center justify-between px-4 py-3.5 cursor-pointer select-none"
                onClick={() => !editingName && setExpanded((e) => !e)}
            >
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className={dotClass} />
                    {editingName ? (
                        <input
                            className="bg-zinc-950 border border-zinc-700 rounded text-zinc-100 text-[15px] font-medium px-2 py-0.5 outline-none flex-1 min-w-0"
                            value={nameVal}
                            autoFocus
                            onChange={(e) => setNameVal(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename();
                                if (e.key === 'Escape') {
                                    setNameVal(ball.name);
                                    setEditingName(false);
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <span
                            className={clsx(
                                'text-[15px] font-medium truncate',
                                dismissed ? 'text-zinc-600' : 'text-zinc-300',
                            )}
                        >
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
                        onClick={(e) => {
                            e.stopPropagation();
                            setEditingName(true);
                            setExpanded(true);
                        }}
                        title="Rename"
                    >
                        <IconEdit />
                    </button>
                    <button
                        className="bg-transparent border-none cursor-pointer text-zinc-600 p-1 rounded flex items-center transition-colors hover:text-red-400"
                        onClick={(e) => {
                            e.stopPropagation();
                            deleteBall(ball.id);
                        }}
                        title="Delete"
                    >
                        <IconTrash />
                    </button>
                    <IconChevron open={expanded} />
                </div>
            </div>

            {expanded && (
                <div className="px-4 pb-4 border-t border-zinc-800/50">
                    <TaskList ballId={ball.id} />
                    <BallCardActions ballId={ball.id} />
                </div>
            )}
        </div>
    );
};

export default BallCard;
