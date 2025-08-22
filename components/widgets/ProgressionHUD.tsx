"use client";
import WatchCard from '@/components/ui/WatchCard';
import { useProgression } from '@/lib/hooks/useProgression';
import { motion, useReducedMotion } from 'framer-motion';
import { motionConfig } from '@/lib/motion';

// Lightweight HUD showing: Level, XP bar, streak, quick action to simulate XP gain.
export function ProgressionHUD() {
  const prefersReduced = !!useReducedMotion();
  const { state, summary, addXp, idle, claimIdle } = useProgression();
  if (!state || !summary) return null;
  const pct = Math.min(1, summary.ratio);
  const remaining = summary.needed - summary.currentProgress;

  return (
    <WatchCard title="Progression" subtitle={`Niveau ${state.level}`} ariaDescription="Suivi de progression: niveau, barre d'XP et série quotidienne.">
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-neutral-500">
            <span>XP</span>
            <span>{summary.currentProgress}/{summary.needed}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-neutral-200">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={motionConfig(prefersReduced)}
              className="h-full rounded-full bg-neutral-900"
            />
          </div>
          <p className="mt-1 text-[11px] text-neutral-600">Il reste {remaining} XP avant le niveau {state.level + 1}.</p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <div className="text-xs text-neutral-500 uppercase">Série</div>
            <div className="mt-0.5 font-semibold">{state.streakDays}j</div>
          </div>
          <div>
            <div className="text-xs text-neutral-500 uppercase">Total XP</div>
            <div className="mt-0.5 font-semibold">{state.xp}</div>
          </div>
          <div className="ml-auto">
            <div className="flex gap-2">
              <button onClick={() => addXp(75)} className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium bg-neutral-100 hover:bg-neutral-200 transition focus:outline-none focus:ring-2 focus:ring-neutral-900/30">
                +75 XP
              </button>
              {idle.available > 0 && (
                <button onClick={claimIdle} className="rounded-md border border-neutral-900 px-3 py-1 text-xs font-semibold bg-neutral-900 text-white hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-neutral-900/50">
                  Revenir +{idle.available} XP
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </WatchCard>
  );
}

export default ProgressionHUD;
