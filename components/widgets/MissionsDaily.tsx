"use client";
import { useEffect, useState } from 'react';
import WatchCard from '@/components/ui/WatchCard';
import { loadMissions, regenerateIfNeeded, MissionsState, completeMission } from '@/lib/missions';
import { awardXp } from '@/lib/progression';
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion';
import { motionConfig } from '@/lib/motion';

export function MissionsDaily() {
  const [state, setState] = useState<MissionsState | null>(null);
  const prefersReduced = !!useReducedMotion();
  const t = motionConfig(prefersReduced);

  useEffect(() => {
    const s = regenerateIfNeeded();
    setState({ ...s });
  }, []);

  function handleToggle(id: string) {
    if (!state) return;
    const { state: newState, reward } = completeMission(state, id);
    setState({ ...newState });
    if (reward > 0) {
      awardXp(reward);
    }
  }

  if (!state) return null;
  const done = state.missions.filter(m => m.status === 'done').length;

  return (
    <WatchCard title="Missions" subtitle={`${done}/${state.missions.length} complétées`} ariaDescription="Liste des missions journalières à compléter pour gagner de l'expérience.">
  <ul className="space-y-2">
        <AnimatePresence initial={false}>
          {state.missions.map((m, i) => {
            const checked = m.status === 'done';
            return (
              <motion.li
                key={m.id}
                layout
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={t}
                className="flex items-start gap-3 rounded-lg border border-neutral-200 bg-white px-3 py-2"
              >
                <button
                  onClick={() => handleToggle(m.id)}
                  aria-pressed={checked}
                  className={`mt-0.5 h-5 w-5 shrink-0 rounded border flex items-center justify-center text-[10px] font-bold transition ${checked ? 'bg-neutral-900 text-white border-neutral-900' : 'border-neutral-300 hover:border-neutral-500'} focus:outline-none focus:ring-2 focus:ring-neutral-900/40`}
                >
                  {checked ? '✓' : ''}
                </button>
                <div className="flex-1">
                  <p className="text-xs font-medium leading-snug text-neutral-900">{m.title}</p>
                  <p className="mt-0.5 text-[10px] text-neutral-500">{m.xpReward} XP</p>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
      <p className="mt-3 text-[10px] text-neutral-500">Renouvellement automatique chaque jour ({state.date}).</p>
    </WatchCard>
  );
}

export default MissionsDaily;
