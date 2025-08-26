This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Environment Variables

The application accepts the following optional variables:

- `CG_KEY`
- `ETHERSCAN_API_KEY`
- `POLYGONSCAN_API_KEY`
- `BSCSCAN_API_KEY`
- `NEXTAUTH_URL`
- `NEXTAUTH_SECRET`
- `DATABASE_URL`

Configure these under **Project → Settings → Environment Variables** in Vercel. Missing values will only trigger a warning at runtime and will not block the build.

## Deployment

- Build command: `npm run build` (default on Vercel).
- Prisma Client is generated automatically during install via the `postinstall` script.

## Désactiver les appels Coingecko
Mettre dans `.env.local`:
```
DISABLE_COINGECKO=true
```
Ou côté client forcer mock:
```
NEXT_PUBLIC_USE_MOCK_PRICES=true
```
La priorité: `DISABLE_COINGECKO` > absence de clé > `NEXT_PUBLIC_USE_MOCK_PRICES`.

## BigQuery – Cache de prix & métadonnées

Objectif: réduire les appels directs à l'API Coingecko en stockant un snapshot récent des prix dans BigQuery.

### Tables recommandées

1. Liste tokens (autocomplete)
```
CREATE TABLE `${BQ_TOKENS_DATASET}.${BQ_TOKENS_TABLE}` (
	id STRING NOT NULL,       -- id coingecko
	symbol STRING,            -- ticker
	name STRING,              -- nom
	rank INT64,               -- optionnel
	updated_at TIMESTAMP
) PARTITION BY DATE(updated_at);

Sync automatique (script): `node scripts/sync-tokens-coingecko.mjs`
- Pages contrôlées par `TOKEN_SYNC_PAGES` (par défaut 3 → ~750 tokens top market cap)
- `TOKEN_SYNC_TRUNCATE=true` pour nettoyer avant réinsertion.
- Forcer actualisation côté API: `/api/tokens?refresh=1`
```

2. Cache prix
```
CREATE TABLE `${BQ_PRICES_DATASET}.${BQ_PRICES_TABLE}` (
	id STRING NOT NULL,
	ts TIMESTAMP NOT NULL,
	usd FLOAT64,
	source STRING  -- 'coingecko' | 'ingest' | 'manual'
) PARTITION BY DATE(ts) CLUSTER BY id;
```

### Variables d'environnement spécifiques
```
BQ_KEY_B64=...           # clé service account JSON encodée base64
GOOGLE_PROJECT_ID=...
BQ_LOCATION=EU           # ou US
BQ_TOKENS_DATASET=...
BQ_TOKENS_TABLE=...
BQ_PRICES_DATASET=...
BQ_PRICES_TABLE=...
```

### Flux runtime
1. `getPrices()` tente d'abord mémoire (TTL 30s).
2. Puis lit BigQuery (prix ≤ 180s).
3. Manquants -> fetch Coingecko -> insertion BigQuery (asynchrone).

### Ingestion périodique (optionnel)
Script fourni: `scripts/ingest-prices.mjs`
```
node scripts/ingest-prices.mjs bitcoin,ethereum,solana
```
À planifier (ex: cron externe) toutes les 1-5 minutes.

### Route de préchauffage (dev / cron)
`POST /api/prices/refresh` avec body:
```
{"ids":["bitcoin","ethereum"]}
```
Header optionnel: `x-refresh-secret: <PRICES_REFRESH_SECRET>` si défini.

### Limiter encore les coûts
- Ajuster `maxAgeSeconds` dans `fetchRecentPricesFromBigQuery` (actuel 180).
- Pré-ingérer un univers fixe top N.
- Ne jamais interroger plus de ~200 ids en un seul appel.
- Ajouter agrégations journalières (future table) pour historique.

### Historique futur (idée)
Créer une table `prices_daily` avec prix de clôture quotidien pour graph NAV longue période.

## Script d'ingestion rapide
Voir `scripts/ingest-prices.mjs`.

### Initialiser automatiquement les datasets / tables
Si tu ne vois pas les tables dans BigQuery, exécute le script d'init (après avoir mis les variables dans `.env.local` ou dans ton shell):
```
node scripts/init-bigquery.mjs
```
Il crée (si absents):
- Dataset & table tokens (`BQ_TOKENS_DATASET`.`BQ_TOKENS_TABLE`)
- Dataset & table prix (`BQ_PRICES_DATASET`.`BQ_PRICES_TABLE`)

Ensuite tu peux lancer une ingestion de prix puis vérifier dans la console BigQuery.

## BigQuery – Journal des transactions portefeuille (mutations)

Chaque mutation (add_position, update_quantity, remove_position, sell_percent, rebalance, diversify) est envoyée en append-only dans une table BigQuery si `BIGQUERY_LOGGING_ENABLED=true`.

### Variables d'environnement supplémentaires
```
BIGQUERY_LOGGING_ENABLED=true
BIGQUERY_PROJECT_ID=starlit-verve-458814-u9
BIGQUERY_DATASET=projectscanner
BIGQUERY_TABLE=portfolio_transactions
```

Authentification locale SDK:
```
gcloud auth application-default login
```
Ou fournir un Service Account JSON via la variable standard:
```
GOOGLE_APPLICATION_CREDENTIALS=/path/sa-key.json
```

### Schéma créé automatiquement
```
userId STRING,
portfolioId STRING,
action STRING,
symbol STRING,
assetId STRING,
delta FLOAT64,
beforeAmt FLOAT64,
afterAmt FLOAT64,
price FLOAT64,
meta JSON,
source STRING,
createdAt TIMESTAMP
```

Le code crée dataset/table si absents (partition journalière). Les insertions sont best-effort: échec BigQuery n'interrompt pas la mutation applicative.

Endpoint de lecture (debug):
```
GET /api/me/transactions?limit=50
```
Retour: `{ ok:true, transactions:[ ... ] }`.



## Source de prix CoinMarketCap (optionnel)
Pour autoriser n'importe quel symbole CoinMarketCap sans maintenir une liste d'ids Coingecko:
1. Définir une clé API: `CMC_API_KEY=xxxx` (ou `COINMARKETCAP_API_KEY`).
2. Choisir le mode: `PRICE_SOURCE=cmc` (ou `NEXT_PUBLIC_PRICE_MODE=cmc`).
3. Dans ce mode, le portefeuille traite les `id` comme des symboles (BTC, ETH, SOL...).
4. Limites: collisions de symboles possibles (choisit le plus populaire); pas de cache BigQuery encore branché pour CMC (peut être ajouté ensuite).
5. Données fournies: prix USD + variations 24h / 7d si disponibles.

Fallback ordre:
1. Mock (si `NEXT_PUBLIC_USE_MOCK_PRICES=true` ou aucune clé ou `DISABLE_COINGECKO=true`).
2. CoinMarketCap si `PRICE_SOURCE=cmc`.
3. Coingecko sinon.

## CoinGecko (clé PRO vs clé demo)
La route `/api/prices` utilise l'API `/simple/price` de CoinGecko.

Variables pertinentes:
```
COINGECKO_API_BASE=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=   # si fourni => header x-cg-pro-api-key
```
Fallback si `COINGECKO_API_KEY` est vide:
```
header: x-cg-demo-api-key: CG-9be1b4b8-e3b1-4f9b-8d9f-4f3b78d5
```
Le cache mémoire serveur (TTL 5 min) évite une surcharge et SWR côté client rafraîchit toutes les 5 minutes.


