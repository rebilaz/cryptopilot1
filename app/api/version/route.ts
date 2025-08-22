import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function GET() {
  return NextResponse.json({ buildTime: process.env.BUILD_TIME || null, now: new Date().toISOString() });
}
