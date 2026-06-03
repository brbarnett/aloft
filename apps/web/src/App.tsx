import { useState } from 'react';
import clsx from 'clsx';
import FlightStrip from './components/FlightStrip';
import { useFlights } from './hooks/useFlights';

const App = () => {
    const [newName, setNewName] = useState('');
    const [showAdd, setShowAdd] = useState(false);
    const { data, active, done, notificationStatus, requestNotification, addFlight } = useFlights();

    const handleAdd = (e: React.SyntheticEvent) => {
        e.preventDefault();
        if (!newName.trim()) return;
        addFlight(newName.trim());
        setNewName('');
        setShowAdd(false);
    };

    const dateStr = new Date()
        .toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short' })
        .toUpperCase()
        .replace(',', '');

    return (
        <div className="font-mono bg-[#060e06] text-[#4ade80] min-h-screen relative overflow-hidden">
            <div className="atc-scanlines" />
            <div className="atc-vignette" />

            <div className="relative z-[6] max-w-[680px] mx-auto px-6 pt-6 pb-[60px]">
                {/* Header */}
                <div className="flex justify-between items-baseline border-b border-[#1a3d1a] pb-[14px] mb-1">
                    <span className="text-[20px] text-[#6ee77c] tracking-[5px]">ALOFT TRACON</span>
                    <div className="flex gap-3 items-center">
                        <span className="text-[11px] text-[#2a5c2a] tracking-[1px]">
                            {dateStr} &nbsp;·&nbsp; <span className="text-[#4ade80]">{active.length}</span> AIRBORNE
                            &nbsp;·&nbsp; <span className="text-[#4ade80]">{done.length}</span> CLEARED
                        </span>
                        {notificationStatus !== 'unsupported' && (
                            <button
                                className={clsx(
                                    'bg-transparent border border-[#1d4d1d] font-mono text-[9px] tracking-[1px] px-2 py-[3px] cursor-pointer uppercase',
                                    notificationStatus === 'granted'
                                        ? 'text-[#4ade80]'
                                        : 'text-[#2a5c2a]',
                                )}
                                onClick={requestNotification}
                            >
                                {notificationStatus === 'granted' ? '🔔 ON' : 'NOTIFY'}
                            </button>
                        )}
                    </div>
                </div>

                {/* All cleared banner */}
                {done.length > 0 && done.length === data.flights.length && (
                    <div className="border border-[#1a3d1a] bg-[rgba(0,20,0,0.5)] px-[14px] py-2 mt-3 text-[11px] text-[#2a7a2a] tracking-[1px] text-center">
                        ✓ ALL FLIGHTS CLEARED FOR TODAY
                    </div>
                )}

                {/* Airborne section */}
                {active.length > 0 && (
                    <>
                        <div className="text-[9px] tracking-[3px] text-[#2a5c2a] uppercase mt-5 mb-2">
                            // AIRBORNE
                        </div>
                        <div className="border border-[#1a3d1a] bg-[rgba(0,12,0,0.4)] p-[3px]">
                            {active.map((flight) => (
                                <FlightStrip key={flight.id} flight={flight} />
                            ))}
                        </div>
                    </>
                )}

                {/* Cleared today section */}
                {done.length > 0 && (
                    <>
                        <div className="text-[9px] tracking-[3px] text-[#2a5c2a] uppercase mt-5 mb-2">
                            // CLEARED TODAY
                        </div>
                        <div className="border border-[#1a3d1a] bg-[rgba(0,12,0,0.4)] p-[3px]">
                            {done.map((flight) => (
                                <FlightStrip key={flight.id} flight={flight} />
                            ))}
                        </div>
                    </>
                )}

                {/* Empty state */}
                {data.flights.length === 0 && (
                    <div className="text-[11px] text-[#1d4d1d] tracking-[2px] text-center py-[40px]">
                        NO ACTIVE FLIGHTS — SQUAWK A NEW ONE BELOW
                    </div>
                )}

                {/* Add flight section */}
                <div className="mt-4">
                    {showAdd ? (
                        <form className="flex gap-2" onSubmit={handleAdd}>
                            <input
                                className="bg-[rgba(0,8,0,0.6)] border border-[#2a5c2a] text-[#6ee77c] font-mono text-[14px] px-3 py-2 flex-1 outline-none"
                                placeholder="FLIGHT NAME..."
                                value={newName}
                                autoFocus
                                onChange={(e) => setNewName(e.target.value)}
                            />
                            <button
                                type="button"
                                className="bg-transparent border border-[#1d4d1d] text-[#2a5c2a] font-mono text-[11px] px-[14px] py-2 cursor-pointer tracking-[1px] uppercase"
                                onClick={() => {
                                    setShowAdd(false);
                                    setNewName('');
                                }}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className={clsx(
                                    'font-mono text-[11px] px-[14px] py-2 tracking-[1px] uppercase',
                                    newName.trim()
                                        ? 'bg-[rgba(74,222,128,0.1)] border border-[#4ade80] text-[#4ade80] cursor-pointer'
                                        : 'bg-transparent border border-[#1d4d1d] text-[#1d4d1d] cursor-default',
                                )}
                                disabled={!newName.trim()}
                            >
                                SQUAWK
                            </button>
                        </form>
                    ) : (
                        <button
                            className="bg-transparent border border-dashed border-[#1a3d1a] text-[#1d5c1d] font-mono text-[11px] px-4 py-[10px] cursor-pointer tracking-[1px] w-full text-left"
                            onClick={() => setShowAdd(true)}
                        >
                            + SQUAWK NEW FLIGHT
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default App;
