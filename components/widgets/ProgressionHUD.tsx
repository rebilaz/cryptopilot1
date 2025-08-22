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
          <div className="flex items-center justify-between text-[11px] uppercase tracking-wide text-white/60">
            <span>XP</span>
            <span>{summary.currentProgress}/{summary.needed}</span>
          </div>
          <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-white/10">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct * 100}%` }}
              transition={motionConfig(prefersReduced)}
              className="h-full rounded-full bg-gradient-to-r from-indigo-400 via-fuchsia-400 to-pink-400"
            />
          </div>
          <p className="mt-1 text-[11px] text-white/55">Il reste {remaining} XP avant le niveau {state.level + 1}.</p>
        </div>
        <div className="flex items-center gap-6 text-sm">
          <div>
            <div className="text-xs text-white/55 uppercase">Série</div>
            <div className="mt-0.5 font-semibold">{state.streakDays}j</div>
          </div>
          <div>
            <div className="text-xs text-white/55 uppercase">Total XP</div>
            <div className="mt-0.5 font-semibold">{state.xp}</div>
          </div>
          <div className="ml-auto">
            <div className="flex gap-2">
              <button onClick={() => addXp(75)} className="rounded-md bg-white/10 px-3 py-1 text-xs font-medium backdrop-blur transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-indigo-400/60">
                +75 XP
              </button>
              {idle.available > 0 && (
                <button onClick={claimIdle} className="rounded-md bg-gradient-to-r from-indigo-400 to-pink-400 px-3 py-1 text-xs font-semibold text-black shadow hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-indigo-400/60">
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
