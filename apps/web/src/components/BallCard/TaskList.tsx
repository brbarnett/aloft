import { useState } from 'react';
import type { Task } from '@aloft/types';
import clsx from 'clsx';
import { useBalls } from '../../hooks/useBalls';
import { IconCheck, IconEdit, IconPlus, IconTrash } from './icons';

interface Props {
    ballId: string;
}

const TaskList = ({ ballId }: Props) => {
    const { data, addTask, toggleTask, deleteTask, editTask } = useBalls();
    const ball = data.balls.find((b) => b.id === ballId);

    const [taskInput, setTaskInput] = useState('');
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [editingTaskVal, setEditingTaskVal] = useState('');

    if (!ball) return null;

    const startEditTask = (task: Task) => {
        setEditingTaskId(task.id);
        setEditingTaskVal(task.text);
    };

    const commitEditTask = () => {
        const v = editingTaskVal.trim();
        if (v && editingTaskId) editTask(ballId, editingTaskId, v);
        setEditingTaskId(null);
        setEditingTaskVal('');
    };

    const handleAddTask = (e: React.FormEvent) => {
        e.preventDefault();
        if (taskInput.trim()) {
            addTask(ballId, taskInput.trim());
            setTaskInput('');
        }
    };

    return (
        <>
            {ball.tasks.length > 0 && (
                <div className="pt-3 flex flex-col gap-1.5">
                    {ball.tasks.map((task) => (
                        <div key={task.id} className="flex items-center gap-2">
                            <button
                                className={clsx(
                                    'w-[18px] h-[18px] rounded border bg-transparent cursor-pointer flex items-center justify-center shrink-0 transition-all',
                                    task.done
                                        ? 'bg-lime-300 border-lime-300 text-zinc-950'
                                        : 'border-zinc-700 text-transparent hover:border-lime-300',
                                )}
                                onClick={() => toggleTask(ballId, task.id)}
                            >
                                {task.done && <IconCheck />}
                            </button>
                            {editingTaskId === task.id ? (
                                <input
                                    className="bg-zinc-950 border border-zinc-800 rounded-md text-zinc-400 text-[13px] px-2.5 py-1.5 flex-1 outline-none focus:border-zinc-700"
                                    value={editingTaskVal}
                                    autoFocus
                                    onChange={(e) => setEditingTaskVal(e.target.value)}
                                    onBlur={commitEditTask}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') commitEditTask();
                                        if (e.key === 'Escape') setEditingTaskId(null);
                                    }}
                                />
                            ) : (
                                <span
                                    className={clsx(
                                        'text-[13px] flex-1',
                                        task.done ? 'line-through text-zinc-600' : 'text-zinc-400',
                                    )}
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
                                        onClick={() => deleteTask(ballId, task.id)}
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
                    onChange={(e) => setTaskInput(e.target.value)}
                />
                <button
                    type="submit"
                    className="bg-transparent border-none cursor-pointer text-zinc-500 p-1 rounded flex items-center transition-colors disabled:opacity-30 disabled:cursor-default enabled:hover:text-lime-300"
                    disabled={!taskInput.trim()}
                >
                    <IconPlus />
                </button>
            </form>
        </>
    );
};

export default TaskList;
