import OpenAI from 'openai';

// Singleton OpenAI client
let _client: OpenAI | null = null;

export function getOpenAI() {
  if (!_client) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('OPENAI_API_KEY manquant');
    _client = new OpenAI({ apiKey, baseURL: process.env.OPENAI_BASE_URL || undefined });
  }
  return _client;
}

export type { OpenAI } from 'openai';
