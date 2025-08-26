import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const runtime = 'nodejs';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const email: string | undefined = body?.email?.toLowerCase?.().trim?.();
    const password: string | undefined = body?.password;
    const name: string | undefined = body?.name?.trim?.();
    if (!email || !EMAIL_RE.test(email) || !password || password.length < 8) {
      return NextResponse.json({ error: 'invalid_input' }, { status: 400 });
    }
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) return NextResponse.json({ error: 'email_taken' }, { status: 409 });
    const hash = await bcrypt.hash(password, 10);
  await prisma.user.create({ data: { email, name: name || null, passwordHash: hash } as any });
    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: 'signup_failed' }, { status: 500 });
  }
}
