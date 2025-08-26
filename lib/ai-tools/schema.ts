export const tools = [
  {
    type: 'function',
    name: 'get_portfolio',
    description: "Retourne les positions actuelles de l'utilisateur.",
    parameters: { type: 'object', properties: {}, additionalProperties: false }
  },
  {
    type: 'function',
    name: 'add_position',
    description: "Ajoute ou incrémente une position. 'symbol' ex: BTC, ETH.",
    parameters: { type: 'object', required: ['symbol','amount'], properties: {
      symbol: { type: 'string' }, name: { type: 'string' }, amount: { type: 'number', minimum: 0 }
    } }
  },
  {
    type: 'function',
    name: 'set_quantity',
    description: "Fixe la quantité d'un symbole (remplace la quantité actuelle).",
    parameters: { type: 'object', required: ['symbol','amount'], properties: {
      symbol: { type: 'string' }, amount: { type: 'number', minimum: 0 }
    } }
  },
  {
    type: 'function',
    name: 'remove_position',
    description: 'Supprime une position par symbole.',
    parameters: { type: 'object', required: ['symbol'], properties: { symbol: { type: 'string' } } }
  }
] as const;

export type ToolSchema = typeof tools[number];
