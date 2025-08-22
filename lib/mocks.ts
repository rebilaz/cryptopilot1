// ================================
// Mock Data Centralisée CryptoPilot
// Objectif: point unique pour simuler une "base" interne.
// Remplacement futur: appels API / Prisma.
// ================================

// ---- Types (évolutifs) ----
export interface ScoredSignal {
  id: string;              // identifiant stable
  label: string;           // courte étiquette affichée dans widget
  score: number;           // score normalisé (0-100)
  description?: string;    // info additionnelle potentielle (non utilisée UI actuelle)
}

// Signals opportunités / risques (5 chacun) — cohérence Dashboard top 5
export const mockSignals: { opportunities: ScoredSignal[]; risks: ScoredSignal[] } = {
  opportunities: [
    { id: 'op1', label: 'Momentum BTC', score: 72, description: 'Accélération prix supérieure à moyenne 30j.' },
    { id: 'op2', label: 'Flux ETH', score: 65, description: 'Entrées nettes staking + CEX sorties.' },
    { id: 'op3', label: 'Narrative L2', score: 61, description: 'Hausse TVL et usage gas efficient.' },
    { id: 'op4', label: 'Adoption wallets', score: 58, description: 'Nouveaux wallets actifs en progression.' },
    { id: 'op5', label: 'On-chain stable', score: 55, description: 'Croissance stablecoins modérée = base saine.' }
  ],
  risks: [
    { id: 'ri1', label: 'Volatilité implicite', score: 68, description: 'Options pricent large mouvement.' },
    { id: 'ri2', label: 'Levier agrégé', score: 63, description: 'Ratio open interest / market cap élevé.' },
    { id: 'ri3', label: 'Funding rates', score: 60, description: 'Funding positif persistant (excès longs).' },
    { id: 'ri4', label: 'Concentration baleines', score: 57, description: 'Accumulation adressses >1% supply.' },
    { id: 'ri5', label: 'Corrélation macro', score: 54, description: 'Sensibilité indices macro accrue.' }
  ]
};

// Helper simple pour récupérer top N (sortable si logique ajoutée plus tard)
export function getTopSignals(kind: 'opportunities' | 'risks', limit = 5): ScoredSignal[] {
  return mockSignals[kind].slice(0, limit);
}

export const mockProgression = {
  level: 3,
  xp: 1420,
  nextLevelXp: 2000,
  achievements: [
    { id: 'ach1', label: 'Premier Trade' },
    { id: 'ach2', label: 'Analyse Technique' },
    { id: 'ach3', label: 'Gestion du Risque' }
  ]
};

export const mockMissions = [
  { id: 'm1', title: 'Analyser 1 nouveau token', status: 'pending' },
  { id: 'm2', title: 'Compléter quiz risque', status: 'pending' },
  { id: 'm3', title: 'Rééquilibrer portefeuille', status: 'done' }
];

export const mockPortfolio = {
  allocation: [
    { symbol: 'BTC', weight: 38 },
    { symbol: 'ETH', weight: 27 },
    { symbol: 'SOL', weight: 12 },
    { symbol: 'LINK', weight: 8 },
    { symbol: 'ATOM', weight: 5 },
    { symbol: 'Autres', weight: 10 }
  ]
};
