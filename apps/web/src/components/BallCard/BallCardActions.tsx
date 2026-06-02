import { useState } from 'react';
import { isDismissedToday, isSnoozed, snoozeLabel, useBalls } from '../../hooks/useBalls';
import { IconBell, IconSnooze, IconUndo } from './icons';

const SNOOZE_OPTIONS: { label: string; ms: number | null }[] = [
    { label: '20 min', ms: 20 * 60 * 1000 },
    { label: '1 hr', ms: 60 * 60 * 1000 },
    { label: '2 hr', ms: 2 * 60 * 60 * 1000 },
    { label: 'Tomorrow', ms: null },
];

interface Props {
    ballId: string;
}

const BallCardActions = ({ ballId }: Props) => {
    const { data, dismissBall, undoDismiss, snoozeBall } = useBalls();
    const ball = data.balls.find((b) => b.id === ballId);

    const [showSnoozeMenu, setShowSnoozeMenu] = useState(false);

    if (!ball) return null;

    const dismissed = isDismissedToday(ball);
    const snoozed = isSnoozed(ball);

    return (
        <>
            {!dismissed && (
                <div className="mt-3 flex gap-2 items-center flex-wrap">
                    <button
                        className="bg-lime-950 border border-lime-900 text-lime-300 text-xs font-medium px-3.5 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-all hover:bg-lime-900"
                        onClick={() => dismissBall(ballId)}
                    >
                        <IconSnooze /> Done for today
                    </button>
                    <div className="relative">
                        <button
                            className="bg-violet-950 border border-violet-900 text-violet-400 text-xs font-medium px-3.5 py-1.5 rounded-md cursor-pointer flex items-center gap-1.5 whitespace-nowrap transition-all hover:bg-violet-900"
                            onClick={() => setShowSnoozeMenu((v) => !v)}
                        >
                            <IconBell /> Snooze
                        </button>
                        {showSnoozeMenu && (
                            <div className="absolute top-[calc(100%+6px)] left-0 bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden z-[100] min-w-[110px] shadow-[0_4px_20px_rgba(0,0,0,0.5)]">
                                {SNOOZE_OPTIONS.map((opt) => (
                                    <button
                                        key={opt.label}
                                        className="block w-full bg-transparent border-none text-zinc-400 text-[13px] px-3.5 py-2.5 text-left cursor-pointer transition-colors hover:bg-zinc-800 hover:text-violet-400"
                                        onClick={() => {
                                            snoozeBall(ballId, opt.ms);
                                            setShowSnoozeMenu(false);
                                        }}
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
                        onClick={() => undoDismiss(ballId)}
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
                        onClick={() => undoDismiss(ballId)}
                    >
                        <IconUndo /> Undo
                    </button>
                </div>
            )}
        </>
    );
};

export default BallCardActions;
