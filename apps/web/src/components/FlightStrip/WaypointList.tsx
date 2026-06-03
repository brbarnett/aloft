import { useState } from 'react';
import type { Task } from '@aloft/types';
import { useFlights } from '../../hooks/useFlights';
import { IconCheck, IconEdit, IconPlus, IconTrash } from './icons';

interface Props {
    flightId: string;
}

const S = {
    row: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '5px 0',
        borderBottom: '1px solid #0a160a',
    } as React.CSSProperties,
    checkbox: (done: boolean): React.CSSProperties => ({
        width: '13px',
        height: '13px',
        border: `1px solid ${done ? '#4ade80' : '#2a5c2a'}`,
        background: done ? 'rgba(74,222,128,0.1)' : 'transparent',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        color: done ? '#4ade80' : 'transparent',
        fontSize: '8px',
    }),
    text: (done: boolean): React.CSSProperties => ({
        fontFamily: "'Courier New', monospace",
        fontSize: '13px',
        flex: 1,
        color: done ? '#2a5c2a' : '#4ade80',
        textDecoration: done ? 'line-through' : 'none',
    }),
    iconBtn: {
        background: 'transparent',
        border: 'none',
        cursor: 'pointer',
        color: '#2a5c2a',
        padding: '2px',
        display: 'flex',
        alignItems: 'center',
    } as React.CSSProperties,
    input: {
        background: 'rgba(0,8,0,0.6)',
        border: '1px solid #2a5c2a',
        color: '#4ade80',
        fontFamily: "'Courier New', monospace",
        fontSize: '13px',
        padding: '2px 6px',
        flex: 1,
        outline: 'none',
    } as React.CSSProperties,
    addRow: { display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px' } as React.CSSProperties,
    addInput: {
        background: 'rgba(0,8,0,0.6)',
        border: '1px solid #1d4d1d',
        borderBottom: '1px solid #2a5c2a',
        color: '#4ade80',
        fontFamily: "'Courier New', monospace",
        fontSize: '12px',
        padding: '3px 6px',
        flex: 1,
        outline: 'none',
    } as React.CSSProperties,
};

const WaypointList = ({ flightId }: Props) => {
    const { data, addWaypoint, toggleWaypoint, deleteWaypoint, editWaypoint } = useFlights();
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
            {flight.tasks.map((task) => (
                <div key={task.id} style={S.row}>
                    <button style={S.checkbox(task.done)} onClick={() => toggleWaypoint(flightId, task.id)}>
                        {task.done && <IconCheck />}
                    </button>
                    {editingId === task.id ? (
                        <input
                            style={S.input}
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
                        <span style={S.text(task.done)} onDoubleClick={() => !task.done && startEdit(task)}>
                            {task.text}
                        </span>
                    )}
                    {editingId !== task.id && (
                        <>
                            {!task.done && (
                                <button style={S.iconBtn} onClick={() => startEdit(task)} title="Edit">
                                    <IconEdit />
                                </button>
                            )}
                            <button
                                style={{ ...S.iconBtn, color: '#3a1a1a' }}
                                onMouseEnter={(e) => (e.currentTarget.style.color = '#dc2626')}
                                onMouseLeave={(e) => (e.currentTarget.style.color = '#3a1a1a')}
                                onClick={() => deleteWaypoint(flightId, task.id)}
                            >
                                <IconTrash />
                            </button>
                        </>
                    )}
                </div>
            ))}
            <form style={S.addRow} onSubmit={handleAdd}>
                <input
                    style={S.addInput}
                    placeholder="+ ADD WAYPOINT..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                />
                <button
                    type="submit"
                    style={{ ...S.iconBtn, color: input.trim() ? '#4ade80' : '#1d4d1d' }}
                    disabled={!input.trim()}
                >
                    <IconPlus />
                </button>
            </form>
        </div>
    );
};

export default WaypointList;
