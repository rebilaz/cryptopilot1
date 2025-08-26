// tests/setup.ts
// Node 18+ fournit fetch / Request / Response via undici en standard.
// Pour Node < 18, décommente la ligne suivante :
// import 'undici/register';

process.env.OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
