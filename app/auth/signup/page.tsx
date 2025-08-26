"use client";
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null); setMsg(null);
    if (password !== confirm) { setErr('Les mots de passe ne correspondent pas'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password, name }) });
      if (res.status === 201) {
        // auto login
        const e = email; const p = password;
        setPassword(''); setConfirm('');
        await signIn('credentials', { email: e, password: p, redirect: true, callbackUrl: '/dashboard' });
        return;
      }
      if (res.status === 409) setErr('Un compte existe déjà pour cet email.');
      else if (res.status === 400) setErr('Email ou mot de passe invalide.');
      else {
        const j = await res.json().catch(()=>({}));
        setErr(j.error || 'Inscription impossible, réessaie.');
      }
    } finally { setLoading(false); }
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-4">Inscription</h1>
        {err && <p className="text-sm text-red-600 mb-3">{err}</p>}
        {msg && <p className="text-sm text-emerald-600 mb-3">{msg}</p>}
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Nom (optionnel)</label>
            <input type="text" value={name} onChange={e=>setName(e.target.value)} className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Confirmer</label>
            <input type="password" value={confirm} onChange={e=>setConfirm(e.target.value)} required className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/30" />
          </div>
          <button disabled={loading} type="submit" className="w-full rounded bg-neutral-900 text-white py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50">{loading ? '...' : "Créer le compte"}</button>
        </form>
        <p className="mt-4 text-xs text-neutral-500">Déjà un compte ? <a href="/auth/signin" className="text-neutral-900 underline">Connexion</a></p>
      </div>
    </main>
  );
}
