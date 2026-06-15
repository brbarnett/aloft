import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { isDismissedToday, isGrounded, isSnoozed, snoozeLabel, useFlights } from '../../hooks/useFlights';
import { IconHold, IconUndo } from './icons';

const nextMonday = (): number => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    const day = d.getDay(); // 0=Sun, 1=Mon, ..., 6=Sat
    const daysUntilMonday = day === 1 ? 7 : (8 - day) % 7;
    d.setDate(d.getDate() + daysUntilMonday);
    return d.getTime();
};

const getHoldOptions = (): { label: string; until: number }[] => {
    const tomorrow = new Date();
    tomorrow.setHours(24, 0, 0, 0);
    return [
        { label: '20 MIN', until: Date.now() + 20 * 60 * 1000 },
        { label: '1 HR', until: Date.now() + 60 * 60 * 1000 },
        { label: '3 HR', until: Date.now() + 3 * 60 * 60 * 1000 },
        { label: 'TOMORROW', until: tomorrow.getTime() },
        { label: 'NEXT WEEK', until: nextMonday() },
    ];
};

const btnBase =
    'inline-flex items-center gap-1.5 font-mono tracking-[1px] px-3 py-[5px] cursor-pointer uppercase bg-transparent border';

interface Props {
    flightId: string;
}

const FlightStripActions = ({ flightId }: Props) => {
    const { data, dismissFlight, undoDismiss, snoozeFlight, groundFlight, ungroundFlight } = useFlights();
    const flight = data.flights.find((f) => f.id === flightId);
    const [showHold, setShowHold] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

    useEffect(() => {
        if (!showHold) return;
        const handleMouseDown = (e: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
                setShowHold(false);
            }
        };
        document.addEventListener('mousedown', handleMouseDown);
        return () => document.removeEventListener('mousedown', handleMouseDown);
    }, [showHold]);

    if (!flight) return null;

    const grounded = isGrounded(flight);
    const dismissed = isDismissedToday(flight);
    const snoozed = isSnoozed(flight);

    const holdOptions = getHoldOptions();
    const totalOptions = holdOptions.length + 1; // +1 for GROUND

    const closeHold = () => {
        setShowHold(false);
        triggerRef.current?.focus();
    };

    const handleOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
        if (e.key === 'Escape') {
            e.preventDefault();
            closeHold();
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            optionRefs.current[(index + 1) % totalOptions]?.focus();
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            optionRefs.current[(index - 1 + totalOptions) % totalOptions]?.focus();
        }
    };

    return (
        <div className="mt-[10px]">
            {!dismissed && !grounded && (
                <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative" ref={containerRef}>
                        <button
                            ref={triggerRef}
                            className={clsx(btnBase, 'text-[10px] border-[#2a5c2a] text-[#2a7a2a]')}
                            onClick={() => setShowHold((v) => !v)}
                            onKeyDown={(e) => {
                                if (e.key === 'Escape') {
                                    setShowHold(false);
                                } else if ((e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') && !showHold) {
                                    e.preventDefault();
                                    setShowHold(true);
                                    setTimeout(() => optionRefs.current[0]?.focus(), 0);
                                } else if (e.key === 'ArrowDown' && showHold) {
                                    e.preventDefault();
                                    optionRefs.current[0]?.focus();
                                }
                            }}
                        >
                            <IconHold /> HOLD PATTERN
                        </button>
                        {showHold && (
                            <div className="absolute top-[calc(100%+4px)] left-0 bg-[#060e06] border border-[#1d4d1d] z-[100] min-w-[110px]">
                                {holdOptions.map((opt, i) => (
                                    <button
                                        key={opt.label}
                                        ref={(el) => {
                                            optionRefs.current[i] = el;
                                        }}
                                        className="block w-full bg-transparent border-none font-mono text-[10px] text-[#4ade80] px-3 py-[6px] text-left cursor-pointer tracking-[1px]"
                                        onClick={() => {
                                            snoozeFlight(flightId, opt.until);
                                            closeHold();
                                        }}
                                        onKeyDown={(e) => handleOptionKeyDown(e, i)}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
                                <div className="border-t border-[#1d4d1d] mx-2 my-[3px]" />
                                <button
                                    ref={(el) => {
                                        optionRefs.current[holdOptions.length] = el;
                                    }}
                                    className="block w-full bg-transparent border-none font-mono text-[10px] text-[#2a5c2a] px-3 py-[6px] text-left cursor-pointer tracking-[1px]"
                                    onClick={() => {
                                        groundFlight(flightId);
                                        closeHold();
                                    }}
                                    onKeyDown={(e) => handleOptionKeyDown(e, holdOptions.length)}
                                >
                                    GROUND
                                </button>
                            </div>
                        )}
                    </div>
                    <button
                        className={clsx(btnBase, 'text-[10px] border-[#4ade80] text-[#4ade80]')}
                        onClick={() => dismissFlight(flightId)}
                    >
                        ✈ CLEAR TO LAND
                    </button>
                </div>
            )}

            {snoozed && (
                <div className="flex items-center gap-[10px]">
                    <span className="font-mono text-[10px] text-[#2a5c2a] tracking-[1px]">
                        HOLDING FOR {snoozeLabel(flight)}
                    </span>
                    <button
                        className={clsx(btnBase, 'text-[9px] border-[#1d4d1d] text-[#4ade80]')}
                        onClick={() => undoDismiss(flightId)}
                    >
                        <IconUndo /> RESUME
                    </button>
                </div>
            )}

            {dismissed && !snoozed && !grounded && (
                <div className="flex items-center gap-[10px]">
                    <span className="font-mono text-[10px] text-[#1d4d1d] tracking-[1px]">
                        CLEARED — RETURNS TOMORROW
                    </span>
                    <button
                        className={clsx(btnBase, 'text-[9px] border-[#1d4d1d] text-[#4ade80]')}
                        onClick={() => undoDismiss(flightId)}
                    >
                        <IconUndo /> RECALL
                    </button>
                    <button
                        className={clsx(btnBase, 'text-[9px] border-[#1d4d1d] text-[#2a5c2a]')}
                        onClick={() => groundFlight(flightId)}
                    >
                        GROUND
                    </button>
                </div>
            )}

            {grounded && (
                <div className="flex items-center gap-[10px]">
                    <span className="font-mono text-[10px] text-[#1d4d1d] tracking-[1px]">GROUNDED</span>
                    <button
                        className={clsx(btnBase, 'text-[9px] border-[#1d4d1d] text-[#4ade80]')}
                        onClick={() => ungroundFlight(flightId)}
                    >
                        <IconUndo /> RECALL
                    </button>
                </div>
            )}
        </div>
    );
};

export default FlightStripActions;
