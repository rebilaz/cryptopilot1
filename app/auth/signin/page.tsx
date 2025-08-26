"use client";
import { signIn, useSession } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function SignInPage() {
  const { data: session } = useSession();
  const params = useSearchParams();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const rawError = params.get('error');
  const error = rawError === 'CredentialsSignin'
    ? 'Email ou mot de passe incorrect.'
    : rawError === 'OAuthAccountNotLinked'
      ? 'Cette adresse est liée à un autre provider.'
      : rawError
        ? 'Connexion impossible, réessayez.'
        : null;

  useEffect(() => { if (session) router.replace('/dashboard'); }, [session, router]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
  const res = await signIn('credentials', { email, password, callbackUrl: '/dashboard', redirect: true });
  setLoading(false);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-sm rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-4">Connexion</h1>
  {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Email</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} required className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/30" />
          </div>
          <div>
            <label className="block text-xs font-medium text-neutral-600 mb-1">Mot de passe</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} required className="w-full rounded border border-neutral-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neutral-900/30" />
          </div>
          <button disabled={loading} type="submit" className="w-full rounded bg-neutral-900 text-white py-2 text-sm font-medium hover:bg-neutral-800 disabled:opacity-50">{loading ? '...' : 'Se connecter'}</button>
        </form>
        <div className="mt-4">
          <button onClick={()=>signIn('google', { callbackUrl: '/dashboard' })} className="w-full rounded border border-neutral-300 bg-white py-2 text-sm font-medium hover:bg-neutral-50">Continuer avec Google</button>
        </div>
        <div className="mt-3 text-right">
          <a href="#" className="text-xs text-neutral-400 hover:text-neutral-600">Mot de passe oublié ?</a>
        </div>
        <p className="mt-4 text-xs text-neutral-500">Pas de compte ? <a href="/auth/signup" className="text-neutral-900 underline">Inscription</a></p>
      </div>
    </main>
  );
}
