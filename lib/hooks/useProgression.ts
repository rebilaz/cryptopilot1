"use client";
import { useCallback, useEffect, useState } from 'react';
import {
  loadProgression,
  registerVisit,
  saveProgression,
  awardXp,
  progressionSummary,
  computeIdleBonus,
  claimIdleBonus,
  ProgressionState
} from '@/lib/progression';

export interface UseProgressionResult {
  state: ProgressionState | null;
  summary: { currentProgress: number; needed: number; ratio: number } | null;
  idle: { available: number; hours: number };
  addXp: (delta: number) => void;
  claimIdle: () => void;
  refresh: () => void;
}

export function useProgression(): UseProgressionResult {
  const [state, setState] = useState<ProgressionState | null>(null);
  const [idle, setIdle] = useState({ available: 0, hours: 0 });

  const compute = useCallback((s: ProgressionState) => {
    setIdle(computeIdleBonus(s));
  }, []);

  useEffect(() => {
    let s = loadProgression();
    s = registerVisit(s);
    saveProgression(s);
    setState({ ...s });
    compute(s);
    const interval = setInterval(() => {
      const latest = loadProgression();
      compute(latest);
    }, 60_000); // recompute idle every minute
    return () => clearInterval(interval);
  }, [compute]);

  const addXpCb = useCallback((delta: number) => {
    const s = awardXp(delta);
    setState({ ...s });
    compute(s);
  }, [compute]);

  const claimIdleCb = useCallback(() => {
    const s = claimIdleBonus();
    setState({ ...s });
    compute(s);
  }, [compute]);

  const refreshCb = useCallback(() => {
    const s = loadProgression();
    setState({ ...s });
    compute(s);
  }, [compute]);

  const summary = state ? progressionSummary(state) : null;
  return { state, summary, idle, addXp: addXpCb, claimIdle: claimIdleCb, refresh: refreshCb };
}

export default useProgression;
