// Helper functions to compute portfolio metrics (server & client reusable)
export interface PositionValue { symbol: string; quantity: number; valueUsd: number }

export interface PortfolioMetrics {
  totalValue: number;
  largestWeightPct: number; // 0-100
  positionsCount: number;
  stableWeightPct: number; // proportion of stablecoins if identified
  hhi: number; // Herfindahl-Hirschman Index (0-1) using weights^2
  diversificationScore: number; // 0-100 (simple transform of HHI)
  concentrationFlag: boolean; // true if largest > 40%
}

const STABLE_SET = new Set(['USDT','USDC','DAI','FDUSD','TUSD','USDD','USDP','BUSD','EURC']);

export function computeMetrics(positions: PositionValue[]): PortfolioMetrics {
  const totalValue = positions.reduce((a,p)=>a+(p.valueUsd||0),0);
  if (!totalValue) return {
    totalValue:0, largestWeightPct:0, positionsCount:positions.length, stableWeightPct:0, hhi:0, diversificationScore:0, concentrationFlag:false
  };
  const weights = positions.map(p => (p.valueUsd||0)/totalValue);
  const largestWeight = Math.max(...weights, 0);
  const hhi = weights.reduce((a,w)=>a+w*w,0); // 1 = ultra concentré
  // Diversification score simple: (1 - (hhi - 1/n)/(1 - 1/n)) * 100 (normalisation relative au cas équi-réparti)
  const n = positions.length || 1;
  const minHHI = 1/n;
  const divScore = ((1 - (hhi - minHHI)/(1 - minHHI)) * 100);
  const stableValue = positions.filter(p => STABLE_SET.has(p.symbol.toUpperCase())).reduce((a,p)=>a+p.valueUsd,0);
  return {
    totalValue,
    largestWeightPct: largestWeight*100,
    positionsCount: positions.length,
    stableWeightPct: (stableValue/totalValue)*100,
    hhi,
    diversificationScore: Math.max(0, Math.min(100, divScore)),
    concentrationFlag: largestWeight*100 > 40
  };
}
