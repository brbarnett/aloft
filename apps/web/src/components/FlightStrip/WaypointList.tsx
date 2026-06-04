import { useState } from 'react';
import type { Task } from '@aloft/types';
import clsx from 'clsx';
import { useFlights } from '../../hooks/useFlights';
import { IconCheck, IconEdit, IconFlag, IconPlus, IconTrash } from './icons';

export const sortTasks = (tasks: Task[]): Task[] => {
    const order = (t: Task) => {
        if (!t.done && t.expedite) return 0;
        if (!t.done) return 1;
        return 2;
    };
    return [...tasks].sort((a, b) => order(a) - order(b));
};

interface Props {
    flightId: string;
}

const WaypointList = ({ flightId }: Props) => {
    const { data, addWaypoint, toggleWaypoint, deleteWaypoint, editWaypoint, toggleWaypointExpedite } = useFlights();
    const flight = data.flights.find((f) => f.id === flightId);

    const [input, setInput] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editingVal, setEditingVal] = useState('');

    if (!flight) return null;

    const startEdit = (task: Task) => {
        setEditingId(task.id);
        setEditingVal(task.text);
    };

    const commitEdit = () => {
        const v = editingVal.trim();
        if (v && editingId) editWaypoint(flightId, editingId, v);
        setEditingId(null);
    };

    const handleAdd = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (input.trim()) {
            addWaypoint(flightId, input.trim());
            setInput('');
        }
    };

    return (
        <div>
            {sortTasks(flight.tasks).map((task) => (
                <div
                    key={task.id}
                    className={clsx(
                        'flex items-center gap-2 py-[5px] border-b border-[#0a160a]',
                        task.expedite && !task.done && 'border-l-2 border-l-[#4ade80]',
                    )}
                >
                    <button
                        className={clsx(
                            'w-[13px] h-[13px] shrink-0 flex items-center justify-center cursor-pointer text-[8px]',
                            task.done
                                ? 'border border-[#4ade80] bg-[rgba(74,222,128,0.1)] text-[#4ade80]'
                                : 'border border-[#2a5c2a] bg-transparent text-transparent',
                        )}
                        onClick={() => toggleWaypoint(flightId, task.id)}
                    >
                        {task.done && <IconCheck />}
                    </button>
                    <button
                        className="bg-transparent border-none cursor-pointer p-[2px] flex items-center shrink-0"
                        style={{ color: task.expedite ? '#4ade80' : '#2a5c2a' }}
                        onClick={() => toggleWaypointExpedite(flightId, task.id)}
                        title="Expedite"
                    >
                        <IconFlag />
                    </button>
                    {editingId === task.id ? (
                        <input
                            className="bg-[rgba(0,8,0,0.6)] border border-[#2a5c2a] text-[#4ade80] font-mono text-[13px] px-[6px] py-[2px] flex-1 outline-none"
                            value={editingVal}
                            autoFocus
                            onChange={(e) => setEditingVal(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitEdit();
                                if (e.key === 'Escape') setEditingId(null);
                            }}
                        />
                    ) : (
                        <span
                            className={clsx(
                                'font-mono text-[13px] flex-1',
                                task.done ? 'text-[#2a5c2a] line-through' : 'text-[#4ade80] no-underline',
                            )}
                            onDoubleClick={() => !task.done && startEdit(task)}
                        >
                            {task.text}
                        </span>
                    )}
                    {editingId !== task.id && (
                        <>
                            {!task.done && (
                                <button
                                    className="bg-transparent border-none cursor-pointer text-[#2a5c2a] p-[2px] flex items-center"
                                    onClick={() => startEdit(task)}
                                    title="Edit"
                                >
                                    <IconEdit />
                                </button>
                            )}
                            <button
                                className="bg-transparent border-none cursor-pointer text-[#2a5c2a] hover:text-[#4ade80] p-[2px] flex items-center"
                                onClick={() => deleteWaypoint(flightId, task.id)}
                            >
                                <IconTrash />
                            </button>
                        </>
                    )}
                </div>
            ))}
            <form className="flex items-center gap-[6px] mt-[6px]" onSubmit={handleAdd}>
                <input
                    className="bg-[rgba(0,8,0,0.6)] border border-[#1d4d1d] border-b-[#2a5c2a] text-[#4ade80] font-mono text-[12px] px-[6px] py-[3px] flex-1 outline-none"
                    placeholder="+ ADD WAYPOINT..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button
                    type="submit"
                    className={clsx(
                        'bg-transparent border-none cursor-pointer p-[2px] flex items-center',
                        input.trim() ? 'text-[#4ade80]' : 'text-[#1d4d1d]',
                    )}
                    disabled={!input.trim()}
                >
                    <IconPlus />
                </button>
            </form>
        </div>
    );
};

export default WaypointList;
