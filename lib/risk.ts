// Risk aggregation helpers extracted from RiskSynthetic widget for reuse and future decomposition.
import { ScoredSignal } from './mocks';

export interface SyntheticResult {
  value: number; // 0-100
  label: 'Faible' | 'Modéré' | 'Élevé';
  explanation: string;
  delta?: number;
}

export function weightFor(score: number): number {
  if (score >= 70) return 1.0;
  if (score >= 50) return 0.7;
  return 0.4;
}

export function computeSynthetic(signals: ScoredSignal[]): SyntheticResult {
  if (!signals.length) return { value: 0, label: 'Faible', explanation: 'Aucun signal disponible.' };
  let sum = 0; let weightSum = 0;
  for (const s of signals) {
    const w = weightFor(s.score);
    sum += s.score * w;
    weightSum += w;
  }
  const raw = weightSum ? (sum / weightSum) : 0;
  const value = Math.round(raw);
  const label: SyntheticResult['label'] = value < 40 ? 'Faible' : value < 70 ? 'Modéré' : 'Élevé';
  const highRisk = signals.filter(s => s.score >= 70).length;
  const midRisk = signals.filter(s => s.score >= 50 && s.score < 70).length;
  const explanation = label === 'Élevé'
    ? `Plusieurs facteurs sous tension (${highRisk} forts, ${midRisk} modérés). Sur-suivi requis.`
    : label === 'Modéré'
      ? `Situation intermédiaire (${midRisk} signaux modérés). Surveillance continue.`
      : `Contexte relativement calme (${signals.length - midRisk - highRisk} faibles).`;
  return { value, label, explanation };
}
