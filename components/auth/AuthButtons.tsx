"use client";
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';

export function AuthButtons() {
  const { data: session, status } = useSession();
  if (status === 'loading') return <div className="text-xs text-neutral-500">...</div>;
  if (session?.user) {
    return (
      <div className="flex items-center gap-2 text-xs">
        <span className="text-neutral-600 hidden sm:inline">{session.user.email}</span>
        <button onClick={()=>signOut({ callbackUrl: '/' })} className="rounded border border-neutral-300 bg-white px-3 py-1 font-medium hover:bg-neutral-100">Se déconnecter</button>
      </div>
    );
  }
  return (
    <Link href="/auth/signin" className="rounded bg-neutral-900 text-white px-3 py-1 text-xs font-medium hover:bg-neutral-800">Se connecter</Link>
  );
}
