// Progression Engine (offline-first)
// Handles XP, leveling curve, daily streak, and mission progression.
// Pure helpers + localStorage persistence (client-side only).

export interface ProgressionState {
  xp: number;
  level: number;
  nextLevelXp: number; // absolute xp required for next level
  streakDays: number; // consecutive daily visits
  lastActive: string; // ISO date (yyyy-mm-dd)
  lastActiveAt: number; // timestamp ms of last activity (finer grain for idle bonus)
  lastIdleClaim?: number; // timestamp ms last idle bonus claimed
}

const STORAGE_KEY = 'cp_progression_v1';

// Level curve: xp required to REACH level n (cumulative threshold)
// base = 500; growth exponent ~1.25 for mild acceleration.
export function xpThresholdForLevel(level: number): number {
  if (level <= 1) return 0;
  let total = 0;
  for (let l = 1; l < level; l++) {
    total += Math.round(500 * Math.pow(l, 1.25));
  }
  return total;
}

export function levelForXp(xp: number): { level: number; nextLevelXp: number } {
  let level = 1;
  while (true) {
    const nextLevel = level + 1;
    const threshold = xpThresholdForLevel(nextLevel);
    if (xp < threshold) {
      return { level, nextLevelXp: threshold };
    }
    level = nextLevel;
    if (level > 200) { // safeguard
      return { level: 200, nextLevelXp: xp + 1 };
    }
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function loadProgression(): ProgressionState {
  if (typeof window === 'undefined') {
    return bootstrap();
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return bootstrap();
    const parsed = JSON.parse(raw) as ProgressionState;
    // recompute level boundaries (in case curve changed)
    const { level, nextLevelXp } = levelForXp(parsed.xp);
    return { ...parsed, level, nextLevelXp };
  } catch {
    return bootstrap();
  }
}

function bootstrap(): ProgressionState {
  const init: ProgressionState = {
    xp: 0,
    level: 1,
    nextLevelXp: xpThresholdForLevel(2),
    streakDays: 0,
  lastActive: '',
  lastActiveAt: Date.now(),
  lastIdleClaim: 0
  };
  return init;
}

export function saveProgression(state: ProgressionState) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function registerVisit(state: ProgressionState): ProgressionState {
  // Backward compat defaults if upgrading existing stored object
  if (!('lastActiveAt' in state)) (state as any).lastActiveAt = Date.now();
  if (!('lastIdleClaim' in state)) (state as any).lastIdleClaim = 0;
  const today = todayIso();
  if (state.lastActive === today) return state; // already counted today
  if (!state.lastActive) {
    state.streakDays = 1;
  } else {
    // difference in days
    const diff = diffDays(state.lastActive, today);
    if (diff === 1) state.streakDays += 1; else state.streakDays = 1;
  }
  state.lastActive = today;
  state.lastActiveAt = Date.now();
  return state;
}

function diffDays(aIso: string, bIso: string): number {
  const a = new Date(aIso + 'T00:00:00Z').getTime();
  const b = new Date(bIso + 'T00:00:00Z').getTime();
  return Math.round((b - a) / 86400000);
}

export function addXp(state: ProgressionState, delta: number): ProgressionState {
  state.xp += Math.max(0, Math.round(delta));
  const { level, nextLevelXp } = levelForXp(state.xp);
  state.level = level;
  state.nextLevelXp = nextLevelXp;
  return state;
}

// Convenience composite: add XP + register visit + persist
export function awardXp(delta: number): ProgressionState {
  const s = registerVisit(loadProgression());
  addXp(s, delta);
  saveProgression(s);
  return s;
}

export function progressionSummary(state: ProgressionState) {
  const prevLevelXp = xpThresholdForLevel(state.level);
  const currentProgress = state.xp - prevLevelXp;
  const needed = state.nextLevelXp - prevLevelXp;
  return { currentProgress, needed, ratio: needed ? currentProgress / needed : 0 };
}

// ===== Idle Bonus Logic =====
// Simple rule: every full 6h of inactivity (no visit) grants 40 XP, capped at 240 XP (i.e., up to 36h) per comeback.
// A claim is allowed only once after inactivity (lastIdleClaim < lastActiveAt).
export function computeIdleBonus(state: ProgressionState): { available: number; hours: number } {
  if (!state.lastActiveAt) return { available: 0, hours: 0 };
  const now = Date.now();
  const hours = (now - state.lastActiveAt) / 3600000;
  if (hours < 6) return { available: 0, hours };
  // Already claimed since last activity?
  if (state.lastIdleClaim && state.lastIdleClaim >= state.lastActiveAt) return { available: 0, hours };
  const blocks = Math.floor(hours / 6);
  const available = Math.min(blocks * 40, 240);
  return { available, hours };
}

export function claimIdleBonus(): ProgressionState {
  const s = loadProgression();
  const { available } = computeIdleBonus(s);
  if (available > 0) {
    addXp(s, available);
    s.lastIdleClaim = Date.now();
    saveProgression(s);
  }
  return s;
}
