// Missions Engine (daily generation + persistence)
// Generates a small set of daily missions deterministically per day and tracks completion.
// Contextual missions can be added later; for now only daily.

export type MissionStatus = 'pending' | 'done';
export type MissionType = 'daily' | 'contextual';

export interface Mission {
  id: string;           // unique id (day + index or contextual key)
  title: string;        // short label
  type: MissionType;
  xpReward: number;     // XP granted upon completion (one-time)
  status: MissionStatus;
}

export interface MissionsState {
  date: string;          // ISO date of last generation
  missions: Mission[];   // current active missions
  version: number;       // migration aid
}

const STORAGE_KEY = 'cp_missions_v1';
const VERSION = 1;

// Candidate pool (expand over time). Keep short & action oriented.
const DAILY_CANDIDATES: { title: string; xpReward: number }[] = [
  { title: 'Vérifier ton score de risque', xpReward: 60 },
  { title: 'Consulter allocation portefeuille', xpReward: 50 },
  { title: 'Lire une explication pédagogique', xpReward: 55 },
  { title: 'Identifier un risque à améliorer', xpReward: 70 },
  { title: 'Noter une force de ton portefeuille', xpReward: 45 },
  { title: 'Simuler rééquilibrage mental', xpReward: 65 },
  { title: 'Analyser un nouveau token', xpReward: 80 },
  { title: 'Comparer volatilité de 2 actifs', xpReward: 75 },
];

function todayIso(): string { return new Date().toISOString().slice(0,10); }

export function loadMissions(): MissionsState {
  if (typeof window === 'undefined') return generateFresh();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return generateFresh();
    const parsed = JSON.parse(raw) as MissionsState;
    if (parsed.version !== VERSION) return migrate(parsed);
    if (parsed.date !== todayIso()) return regenerate();
    return parsed;
  } catch { return generateFresh(); }
}

export function saveMissions(state: MissionsState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function migrate(old: MissionsState): MissionsState {
  // future migrations; for now regenerate
  return generateFresh();
}

function generateFresh(): MissionsState {
  return { date: todayIso(), missions: pickDailyMissions(), version: VERSION };
}

function regenerate(): MissionsState {
  const fresh = generateFresh();
  saveMissions(fresh);
  return fresh;
}

// Deterministic selection using day number to rotate pool.
function pickDailyMissions(count = 3): Mission[] {
  const date = new Date();
  const daySeed = Math.floor(date.getTime() / 86400000); // days since epoch
  const start = daySeed % DAILY_CANDIDATES.length;
  const selected: Mission[] = [];
  for (let i = 0; i < count; i++) {
    const c = DAILY_CANDIDATES[(start + i) % DAILY_CANDIDATES.length];
    selected.push({
      id: `${todayIso()}_${i}`,
      title: c.title,
      type: 'daily',
      xpReward: c.xpReward,
      status: 'pending'
    });
  }
  return selected;
}

export function completeMission(state: MissionsState, missionId: string): { state: MissionsState; reward: number } {
  const m = state.missions.find(m => m.id === missionId);
  if (!m || m.status === 'done') return { state, reward: 0 };
  m.status = 'done';
  saveMissions(state);
  return { state, reward: m.xpReward };
}

export function regenerateIfNeeded(): MissionsState {
  const loaded = loadMissions();
  if (loaded.date !== todayIso()) return regenerate();
  return loaded;
}
