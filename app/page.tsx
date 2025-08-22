"use client";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ScoreCard from "@/components/ScoreCard";
import NAVChart from "@/components/NAVChart";
import PortfolioPie from "@/components/PortfolioPie";
import PortfolioTable from "@/components/PortfolioTable";
import { MarketStatus } from "@/components/MarketStatus";
import { ListSignals } from "@/components/ListSignals";
import { RiskSynthetic } from "@/components/widgets/RiskSynthetic";
import { PriceTicker } from "@/components/widgets/PriceTicker";
import { PortfolioBubble } from "@/components/PortfolioBubble";
import { ProgressionHUD } from "@/components/widgets/ProgressionHUD";
import { MissionsDaily } from "@/components/widgets/MissionsDaily";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.55, ease: 'easeOut', delay: i * 0.07 },
  }),
};

export default function DashboardPage() {
  return (
    <main className="w-full">
      <section className="px-5 pt-12 md:pt-16 max-w-6xl mx-auto">
        <motion.h1 initial="hidden" animate="visible" variants={fadeUp} className="text-3xl md:text-4xl font-semibold tracking-tight leading-tight">
          Ton copilote crypto.
          <br className="hidden sm:block" /> Clarté, pédagogie, progression.
        </motion.h1>
        <motion.p initial="hidden" animate="visible" variants={fadeUp} custom={1} className="mt-5 max-w-xl text-sm md:text-base text-white/70">
          Analyse ton portefeuille, comprends tes risques et avance chaque jour avec des missions concrètes. Aucun signal d'achat / vente, seulement de la compréhension.
        </motion.p>
      </section>
      <div className="dashboard-grid max-w-6xl mx-auto">
  {/* Ligne 1: Progression | Missions | Risque Synthétique | Prix | Marché */}
  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}><ProgressionHUD /></motion.div>
  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}><MissionsDaily /></motion.div>
  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={2}><RiskSynthetic /></motion.div>
  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={3}><PriceTicker /></motion.div>
  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={4}><MarketStatus /></motion.div>
  {/* Ligne 2: Opportunités | Risques | Score */}
  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={5}><ListSignals title="Opportunités" variant="positive" /></motion.div>
    {/* Ligne 2: Risques + autres */}
  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={6}><ListSignals title="Risques" variant="negative" /></motion.div>
  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={7}>
          <Card>
            <CardHeader>
              <CardTitle>Score synthétique</CardTitle>
            </CardHeader>
            <CardContent>
              <ScoreCard />
            </CardContent>
          </Card>
        </motion.div>
  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={8}>
          <Card>
            <CardHeader><CardTitle>Valeur du portefeuille</CardTitle></CardHeader>
            <CardContent><NAVChart /></CardContent>
          </Card>
        </motion.div>
  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={9}>
          <Card className="md:col-span-2">
            <CardHeader><CardTitle>Allocation</CardTitle></CardHeader>
            <CardContent><PortfolioPie /></CardContent>
          </Card>
        </motion.div>
  <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={10} className="md:col-span-2">
          <Card>
            <CardHeader><CardTitle>Détails</CardTitle></CardHeader>
            <CardContent><PortfolioTable /></CardContent>
          </Card>
        </motion.div>
  </div>
  <PortfolioBubble />
    </main>
  );
}

/* ====== SOUS-COMPOSANTS ====== */

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
