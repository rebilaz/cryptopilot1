import axios from "axios";

interface AddressInput {
  chain: string;
  address: string;
}

interface Position {
  chain: string;
  asset: string;
  amount: number;
  symbol: string;
  decimals: number;
  source: string;
}

const CHAIN_CONFIG: Record<string, { base: string; apiKeyEnv: string; nativeSymbol: string; decimals: number; }> = {
  ethereum: {
    base: "https://api.etherscan.io/api",
    apiKeyEnv: "ETHERSCAN_API_KEY",
    nativeSymbol: "ETH",
    decimals: 18,
  },
  polygon: {
    base: "https://api.polygonscan.com/api",
    apiKeyEnv: "POLYGONSCAN_API_KEY",
    nativeSymbol: "MATIC",
    decimals: 18,
  },
  bsc: {
    base: "https://api.bscscan.com/api",
    apiKeyEnv: "BSCSCAN_API_KEY",
    nativeSymbol: "BNB",
    decimals: 18,
  },
};

export async function fetchBalances(
  { chain, address }: AddressInput,
  includeTokens = true
): Promise<Position[]> {
  const cfg = CHAIN_CONFIG[chain];
  if (!cfg) throw new Error(`Unsupported chain ${chain}`);
  const apiKey = process.env[cfg.apiKeyEnv];

  // Native balance
  const nativeUrl = `${cfg.base}?module=account&action=balance&address=${address}&tag=latest&apikey=${apiKey}`;
  const { data: nativeData } = await axios.get(nativeUrl);
  const nativeAmount = Number(nativeData.result) / 10 ** cfg.decimals;
  const positions: Position[] = [
    {
      chain,
      asset: cfg.nativeSymbol,
      amount: nativeAmount,
      symbol: cfg.nativeSymbol,
      decimals: cfg.decimals,
      source: "import:address",
    },
  ];

  if (!includeTokens) return positions;

  const tokenUrl = `${cfg.base}?module=account&action=tokentx&address=${address}&page=1&offset=100&sort=asc&apikey=${apiKey}`;
  const { data: tokenData } = await axios.get(tokenUrl);
  const map = new Map<string, { symbol: string; decimals: number; balance: bigint }>();

  if (Array.isArray(tokenData.result)) {
    for (const tx of tokenData.result) {
      const value = BigInt(tx.value);
      const dec = parseInt(tx.tokenDecimal, 10) || 0;
      const key = tx.contractAddress;
      if (!map.has(key)) {
        map.set(key, { symbol: tx.tokenSymbol, decimals: dec, balance: BigInt(0) });
      }
      const entry = map.get(key)!;
      if (tx.to.toLowerCase() === address.toLowerCase()) {
        entry.balance += value;
      } else if (tx.from.toLowerCase() === address.toLowerCase()) {
        entry.balance -= value;
      }
    }
  }

  for (const [, v] of map) {
    if (v.balance <= BigInt(0)) continue;
    positions.push({
      chain,
      asset: v.symbol,
      symbol: v.symbol,
      decimals: v.decimals,
      amount: Number(v.balance) / 10 ** v.decimals,
      source: "import:address",
    });
  }

  return positions;
}
