// app/page.tsx
import Link from "next/link";
import PortfolioDemo from "@/components/PortfolioDemo";
import ThemeToggle from "@/components/ThemeToggle";

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#0f1524] text-white">
      {/* Accents de fond discrets */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -left-24 h-80 w-80 rounded-full bg-indigo-500/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 h-80 w-80 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.06),transparent_55%)]" />
      </div>

      {/* Barre minimale */}
      <Header />

      {/* HERO */}
      <section className="mx-auto w-full max-w-6xl px-5 pt-10 pb-16 md:pt-16 md:pb-24">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-3xl md:text-5xl font-semibold tracking-tight">
            Ton portefeuille crypto, analysé par l’IA
          </h1>
          <p className="mt-3 md:mt-4 text-base md:text-lg text-white/70">
            Comprends ton risque, la cohérence de ton allocation et progresse
            comme un investisseur — sans signaux d’achat/vente.
          </p>

          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href="#demo"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-medium
                         bg-indigo-600 hover:bg-indigo-700
                         focus:outline-none focus:ring-4 focus:ring-indigo-400/40
                         transition-[background,transform] will-change-transform hover:-translate-y-0.5"
            >
              Analyser mon portefeuille
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-medium
                         border border-white/15 bg-white/5 hover:bg-white/10
                         focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Accéder au tableau de bord
            </Link>
          </div>

          <p className="mt-3 text-xs text-white/40">
            Éducatif uniquement · aucun conseil en investissement
          </p>
        </div>
      </section>

      {/* DÉMO INTERACTIVE */}
      <section id="demo" className="mx-auto w-full max-w-6xl px-5 pb-12 md:pb-16">
        <PortfolioDemo />
      </section>

      {/* COMMENT ÇA MARCHE */}
      <HowItWorks />

      {/* DIFFÉRENCIATION */}
      <Differentiators />

      {/* APERÇU VISUEL (placeholder) */}
      <section className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
        <div className="rounded-2xl border border-white/10 bg-white/5">
          <div className="aspect-[16/9] w-full grid place-items-center rounded-2xl">
            <span className="text-sm text-white/50">Aperçu du tableau de bord</span>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-white/50">
          Une interface claire, pensée pour progresser.
        </p>
      </section>

      {/* FAQ */}
      <Faq />

      {/* CTA FINAL */}
      <section className="mx-auto w-full max-w-6xl px-5 py-16 md:py-20">
        <div className="rounded-2xl border border-white/10 bg-[#11172a] p-8 md:p-12 text-center">
          <h2 className="text-2xl md:text-3xl font-semibold tracking-tight">
            Prêt à commencer ?
          </h2>
          <div className="mt-6 flex items-center justify-center gap-3">
            <a
              href="#demo"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-medium
                         bg-emerald-600 hover:bg-emerald-700
                         focus:outline-none focus:ring-4 focus:ring-emerald-400/40
                         transition-[background,transform] will-change-transform hover:-translate-y-0.5"
            >
              Tester gratuitement
            </a>
            <Link
              href="/dashboard"
              className="inline-flex items-center justify-center rounded-xl px-6 py-3 font-medium
                         border border-white/15 bg-white/5 hover:bg-white/10
                         focus:outline-none focus:ring-4 focus:ring-white/20"
            >
              Accéder au tableau de bord
            </Link>
          </div>
          <p className="mt-3 text-xs text-white/40">
            Éducatif uniquement · aucun conseil en investissement
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto w-full max-w-6xl px-5 pb-10 text-center text-xs text-white/40">
        © {new Date().getFullYear()} CryptoPilot — Contenu éducatif uniquement
      </footer>
    </main>
  );
}

/* ====== SOUS-COMPOSANTS ====== */

function Header() {
  return (
    <header className="mx-auto w-full max-w-6xl px-5 py-5 flex items-center justify-between">
      <div className="text-sm tracking-wide text-white/60">CryptoPilot</div>
      <nav className="flex items-center gap-2">
        <Link
          href="/dashboard"
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white/80 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-indigo-400/60"
        >
          Tableau de bord
        </Link>
        <ThemeToggle />
      </nav>
    </header>
  );
}

function HowItWorks() {
  const steps = [
    {
      t: "Entre ton portefeuille",
      d: "Adresse publique (à venir) ou saisie manuelle en 30s.",
    },
    {
      t: "L’IA évalue",
      d: "Score pédagogique, niveau de risque, forces/faiblesses, explications.",
    },
    {
      t: "Tu progresses",
      d: "Mission du jour et conseils éducatifs, pas de signaux d’achat/vente.",
    },
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
      <h2 className="text-xl md:text-2xl font-semibold">Comment ça marche</h2>
      <div className="mt-6 grid gap-5 md:grid-cols-3">
        {steps.map((s, i) => (
          <div
            key={i}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <div className="text-xs text-white/60">Étape {i + 1}</div>
            <div className="mt-1 text-lg font-semibold">{s.t}</div>
            <div className="mt-2 text-sm text-white/70">{s.d}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Differentiators() {
  const items = [
    {
      title: "Éducatif d’abord",
      desc: "Comprendre > copier. Pas de signaux, seulement des explications actionnables.",
    },
    {
      title: "Centré portefeuille",
      desc: "Tu vois ton propre risque, ta cohérence et tes leviers d’amélioration.",
    },
    {
      title: "Progression gamifiée",
      desc: "Score + missions = une habitude saine, comme une app de fitness pour la finance.",
    },
  ];
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
      <h2 className="text-xl md:text-2xl font-semibold">
        Pourquoi c’est différent ?
      </h2>
      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
        {items.map((it, i) => (
          <article
            key={i}
            className="group rounded-2xl border border-white/10 bg-white/5 p-6 transition-colors hover:bg-white/[0.08]"
          >
            <h3 className="text-base md:text-lg font-semibold">{it.title}</h3>
            <p className="mt-2 text-sm text-white/70">{it.desc}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

function Faq() {
  const items = [
    {
      q: "Est-ce que CryptoPilot donne des signaux ?",
      a: "Non. CryptoPilot explique ton portefeuille et t’aide à progresser. Éducatif uniquement.",
    },
    {
      q: "Puis-je connecter mon wallet ?",
      a: "Bientôt. Pour l’instant, saisis simplement tes positions pour tester la démo.",
    },
    {
      q: "Mes données sont-elles privées ?",
      a: "Les analyses sont pensées pour respecter ta vie privée. Jamais de clés privées.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: { "@type": "Answer", text: it.a },
    })),
  };

  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-12 md:py-16">
      <h2 className="text-xl md:text-2xl font-semibold">FAQ</h2>
      <div className="mt-6 grid gap-3">
        {items.map((it, i) => (
          <details
            key={i}
            className="rounded-2xl border border-white/10 bg-white/5 p-5"
          >
            <summary className="cursor-pointer text-base font-medium">
              {it.q}
            </summary>
            <p className="mt-2 text-sm text-white/70">{it.a}</p>
          </details>
        ))}
      </div>

      {/* SEO JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
