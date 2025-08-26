"use client";
import { useSession, signIn } from 'next-auth/react';
import ThemeToggle from '@/components/ThemeToggle';
import { usePortfolioSync } from '@/lib/hooks/usePortfolioSync';
import { PortfolioAgent } from '@/components/chat/PortfolioAgent';
import Spinner from '@/components/Spinner';

export default function DashboardPage() {
  const { data: session } = useSession();
  const sync = usePortfolioSync();

  const showImport = session && sync.offerImport && sync.serverEmpty && sync.localHasData;

  return (
    <main className="p-6 space-y-6 max-w-5xl mx-auto">
      <div className="flex justify-end"><ThemeToggle /></div>
      {!session && (
        <div className="rounded border border-neutral-300 p-6 bg-white flex flex-col items-start gap-4">
          <div>
            <h1 className="text-xl font-semibold mb-1">Bienvenue 👋</h1>
            <p className="text-sm text-neutral-600 max-w-md">Connecte-toi pour synchroniser ton portefeuille dans le cloud, le modifier via l'IA et l'importer depuis ton stockage local.</p>
          </div>
          <button onClick={() => signIn()} className="px-4 py-2 rounded bg-neutral-900 text-white text-sm font-medium hover:bg-neutral-800">Se connecter</button>
        </div>
      )}
      {session && (
        <div className="space-y-4">
          {showImport && (
            <div className="rounded border border-amber-300 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between text-sm text-amber-900">
              <div className="flex-1">Des positions locales ont été détectées. Importer dans ton compte ?</div>
              <div className="flex items-center gap-2">
                <button onClick={sync.importLocalIfServerEmpty} disabled={sync.syncing} className="px-3 py-1.5 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-50">{sync.syncing ? 'Import…' : 'Importer'}</button>
                <button onClick={sync.hideImport} className="px-3 py-1.5 rounded border border-amber-400 hover:bg-amber-100">Ignorer</button>
              </div>
            </div>
          )}
          {sync.loading && !sync.positions.length && (
            <div className="rounded border border-neutral-300 bg-white p-10 flex flex-col items-center gap-4">
              <Spinner size={28} label="Chargement" />
              <p className="text-sm text-neutral-600">Récupération du portefeuille…</p>
            </div>
          )}
          {sync.error === 'auth' && (
            <div className="rounded border border-neutral-300 bg-white p-6 text-sm">
              <p className="mb-3 text-neutral-700">Session expirée ou invalide.</p>
              <button onClick={() => signIn()} className="px-3 py-1.5 rounded bg-neutral-900 text-white text-xs font-medium hover:bg-neutral-800">Se reconnecter</button>
            </div>
          )}
          {sync.error && sync.error !== 'auth' && (
            <div className="rounded border border-red-300 bg-red-50 p-6 text-sm">
              <p className="mb-3 text-red-700">{sync.error === 'network' ? 'Problème réseau.' : 'Erreur serveur.'}</p>
              <button onClick={() => sync.refetch()} className="px-3 py-1.5 rounded bg-red-600 text-white text-xs font-medium hover:bg-red-700">Réessayer</button>
            </div>
          )}
          {!sync.loading && !sync.error && (
            <div className="rounded border border-neutral-200 bg-white p-6">
              <header className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold">Portefeuille</h2>
                <div className="flex items-center gap-3">
                  <button onClick={() => sync.refetch().then(()=>console.log('[manual] refetch done'))} className="px-2 py-1 text-xs rounded border border-neutral-300 hover:bg-neutral-100">Refetch</button>
                  {sync.syncing && <Spinner size={18} />}
                </div>
              </header>
              {sync.positions.length ? (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-neutral-500">
                      <th className="text-left py-2 font-medium">Actif</th>
                      <th className="text-right py-2 font-medium">Qté</th>
                    </tr>
                  </thead>
                  <tbody>
                    {sync.positions.map(p => (
                      <tr key={p.id} className="border-t border-neutral-200">
                        <td className="py-2 font-semibold">{p.symbol}</td>
                        <td className="py-2 text-right tabular-nums">{p.amount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="text-sm text-neutral-500">Aucune position.</p>
              )}
            </div>
          )}
          <section className="rounded border border-neutral-200 bg-white p-6">
            <h2 className="text-sm font-semibold mb-2 text-neutral-700">Chat Portefeuille</h2>
            <PortfolioAgent sync={sync} onToggleHistory={() => { /* TODO: intégrer affichage historique dans cette page si désiré */ }} />
          </section>
        </div>
      )}
    </main>
  );
}
