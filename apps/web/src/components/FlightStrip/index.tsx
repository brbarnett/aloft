import { useEffect, useState } from 'react';
import type { Flight } from '@aloft/types';
import clsx from 'clsx';
import { isDismissedToday, isSnoozed, snoozeLabel, useFlights } from '../../hooks/useFlights';
import FlightStripActions from './FlightStripActions';
import WaypointList from './WaypointList';
import { IconEdit, IconTrash } from './icons';

interface Props {
    flight: Flight;
}

const FlightStrip = ({ flight }: Props) => {
    const { renameFlight, deleteFlight, setNote } = useFlights();
    const [expanded, setExpanded] = useState(false);
    const [editingName, setEditingName] = useState(false);
    const [nameVal, setNameVal] = useState(flight.name);
    const [editingNote, setEditingNote] = useState(false);
    const [noteVal, setNoteVal] = useState(flight.note ?? '');
    const [, forceUpdate] = useState(0);

    useEffect(() => {
        const t = setInterval(() => forceUpdate((n) => n + 1), 30_000);
        return () => clearInterval(t);
    }, []);

    const dismissed = isDismissedToday(flight);
    const snoozed = isSnoozed(flight);
    const doneTasks = flight.tasks.filter((t) => t.done);
    const nextWaypoint = flight.tasks.find((t) => !t.done);

    // These are RUNTIME-DYNAMIC — keep as inline style
    const accentColor = dismissed && !snoozed ? '#1d4d1d' : '#4ade80';
    const nameColor = dismissed ? '#1d4d1d' : '#6ee77c';

    const commitRename = () => {
        const v = nameVal.trim();
        if (v && v !== flight.name) renameFlight(flight.id, v);
        else setNameVal(flight.name);
        setEditingName(false);
    };

    const commitNote = () => {
        setNote(flight.id, noteVal.trim() || null);
        setEditingNote(false);
    };

    return (
        <>
            {/* Strip row */}
            <div
                className={clsx(
                    'flex items-stretch border border-[#1d4d1d] min-h-[52px] transition-colors',
                    expanded ? 'mb-0' : 'mb-[3px]',
                    'cursor-pointer',
                )}
                style={{ background: expanded ? 'rgba(0,22,0,0.85)' : 'rgba(0,16,0,0.7)' }}
                onClick={() => !editingName && setExpanded((e) => !e)}
            >
                {/* Accent bar */}
                <div className="w-[5px] shrink-0 self-stretch" style={{ background: accentColor }} />

                {/* Callsign column */}
                <div
                    className={clsx(
                        'w-[80px] shrink-0 flex flex-col items-center justify-center border-r border-[#1a3a1a] p-2 font-mono text-[11px] font-bold tracking-[1px] text-center leading-[1.4]',
                        dismissed ? 'text-[#1d4d1d]' : 'text-[#86efac]',
                    )}
                >
                    {flight.callsign}
                    {snoozed && (
                        <span className="text-[9px] text-[#4ade80] block mt-[2px]">⏱ {snoozeLabel(flight)}</span>
                    )}
                </div>

                {/* Main column */}
                <div className="flex-1 flex flex-col justify-center py-2 px-3 border-r border-[#1a3a1a] min-w-0">
                    {editingName ? (
                        <input
                            className="w-full bg-[rgba(0,8,0,0.6)] border border-[#2a5c2a] text-[#6ee77c] font-mono text-[14px] px-[6px] py-[1px] outline-none"
                            value={nameVal}
                            autoFocus
                            onChange={(e) => setNameVal(e.target.value)}
                            onBlur={commitRename}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') commitRename();
                                if (e.key === 'Escape') {
                                    setNameVal(flight.name);
                                    setEditingName(false);
                                }
                            }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    ) : (
                        <div
                            className="font-mono text-[14px] overflow-hidden text-ellipsis whitespace-nowrap"
                            style={{ color: nameColor }}
                        >
                            {flight.name}
                        </div>
                    )}
                    {nextWaypoint && (
                        <div className="font-mono text-[11px] text-[#2a5c2a] mt-[2px] overflow-hidden text-ellipsis whitespace-nowrap">
                            → {nextWaypoint.text}
                        </div>
                    )}
                    {flight.note && !dismissed && (
                        <div className="font-mono text-[10px] text-[#2a5c2a] mt-[1px] overflow-hidden text-ellipsis whitespace-nowrap italic">
                            ⌁ {flight.note}
                        </div>
                    )}
                    {dismissed && (
                        <div className="font-mono text-[10px] text-[#1d4d1d] mt-[2px]">landed · returns tomorrow</div>
                    )}
                </div>

                {/* Right column */}
                <div className="w-[90px] shrink-0 flex flex-col items-end justify-center p-2 pr-[10px] gap-1">
                    <div className="font-mono text-[11px] text-[#2a5c2a]">
                        {doneTasks.length}/{flight.tasks.length} wpts
                    </div>
                    <div className="flex gap-[3px]" onClick={(e) => e.stopPropagation()}>
                        {!dismissed && (
                            <button
                                className="bg-transparent border-none cursor-pointer text-[#2a5c2a] p-[2px] flex items-center"
                                onClick={() => setEditingName(true)}
                                title="Rename"
                            >
                                <IconEdit />
                            </button>
                        )}
                        <button
                            className="bg-transparent border-none cursor-pointer text-[#2a5c2a] hover:text-[#4ade80] p-[2px] flex items-center"
                            onClick={() => deleteFlight(flight.id)}
                            title="Delete"
                        >
                            <IconTrash />
                        </button>
                    </div>
                </div>
            </div>

            {/* Expanded panel */}
            {expanded && (
                <div className="border border-[#1d4d1d] border-t-0 bg-[rgba(0,10,0,0.85)] mb-[3px]">
                    <div className="p-3 pb-[14px] pl-[98px]">
                        <WaypointList flightId={flight.id} />

                        {/* Pilot note section */}
                        <div className="mt-[10px] border border-[#142814] bg-[rgba(0,8,0,0.5)] p-2 px-[10px]">
                            <div className="font-mono text-[9px] tracking-[2px] text-[#2a5c2a] mb-1">// PILOT NOTE</div>
                            {editingNote ? (
                                <textarea
                                    className="bg-transparent border-none outline-none resize-none font-mono text-[12px] text-[#4ade80] w-full leading-[1.5] opacity-85"
                                    rows={2}
                                    value={noteVal}
                                    autoFocus
                                    onChange={(e) => setNoteVal(e.target.value)}
                                    onBlur={commitNote}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Escape') commitNote();
                                    }}
                                />
                            ) : (
                                <div
                                    className={clsx(
                                        'font-mono text-[12px] leading-[1.5] cursor-text min-h-[18px]',
                                        flight.note ? 'text-[#4ade80] opacity-80' : 'text-[#1d4d1d] opacity-50',
                                    )}
                                    onClick={() => setEditingNote(true)}
                                >
                                    {flight.note ?? 'click to add note...'}
                                </div>
                            )}
                        </div>

                        <FlightStripActions flightId={flight.id} />
                    </div>
                </div>
            )}
        </>
    );
};

export default FlightStrip;
