import { useState } from 'react';
import clsx from 'clsx';
import { isDismissedToday, isSnoozed, snoozeLabel, useFlights } from '../../hooks/useFlights';
import { IconHold, IconUndo } from './icons';

const HOLD_OPTIONS: { label: string; ms: number | null }[] = [
    { label: '20 MIN', ms: 20 * 60 * 1000 },
    { label: '1 HR', ms: 60 * 60 * 1000 },
    { label: '2 HR', ms: 2 * 60 * 60 * 1000 },
    { label: 'TOMORROW', ms: null },
];

const btnBase =
    'inline-flex items-center gap-1.5 font-mono tracking-[1px] px-3 py-[5px] cursor-pointer uppercase bg-transparent border';

interface Props {
    flightId: string;
}

const FlightStripActions = ({ flightId }: Props) => {
    const { data, dismissFlight, undoDismiss, snoozeFlight } = useFlights();
    const flight = data.flights.find((f) => f.id === flightId);
    const [showHold, setShowHold] = useState(false);

    if (!flight) return null;

    const dismissed = isDismissedToday(flight);
    const snoozed = isSnoozed(flight);

    return (
        <div className="mt-[10px]">
            {!dismissed && (
                <div className="flex gap-2 items-center flex-wrap">
                    <div className="relative">
                        <button
                            className={clsx(btnBase, 'text-[10px] border-[#2a5c2a] text-[#2a7a2a]')}
                            onClick={() => setShowHold((v) => !v)}
                        >
                            <IconHold /> HOLD PATTERN
                        </button>
                        {showHold && (
                            <div className="absolute top-[calc(100%+4px)] left-0 bg-[#060e06] border border-[#1d4d1d] z-[100] min-w-[110px]">
                                {HOLD_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.label}
                                        className="block w-full bg-transparent border-none font-mono text-[10px] text-[#4ade80] px-3 py-[6px] text-left cursor-pointer tracking-[1px]"
                                        onClick={() => {
                                            snoozeFlight(flightId, opt.ms);
                                            setShowHold(false);
                                        }}
                                    >
                                        {opt.label}
                                    </button>
                                ))}
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

            {dismissed && !snoozed && (
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
                </div>
            )}
        </div>
    );
};

export default FlightStripActions;
