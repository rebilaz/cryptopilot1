"use client";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import NAVChart from "@/components/NAVChart";
import PortfolioPie from "@/components/PortfolioPie";
import PortfolioTable from "@/components/PortfolioTable";

const fade = {
  hidden: { opacity: 0, y: 18 },
  visible: (i: number = 0) => ({ opacity: 1, y: 0, transition: { duration: .5, ease: 'easeOut', delay: i * .06 } })
};

export default function AnalysisPage() {
  return (
    <main className="max-w-7xl mx-auto px-5 py-12">
      <motion.h1 variants={fade} initial="hidden" animate="visible" className="text-3xl font-semibold tracking-tight mb-8">Analyse du Portefeuille</motion.h1>
      <div className="grid gap-6 md:grid-cols-2">
        <motion.div variants={fade} initial="hidden" animate="visible" custom={0}>
          <Card>
            <CardHeader><CardTitle>NAV & Evolution</CardTitle></CardHeader>
            <CardContent><NAVChart /></CardContent>
          </Card>
        </motion.div>
        <motion.div variants={fade} initial="hidden" animate="visible" custom={1}>
          <Card>
            <CardHeader><CardTitle>Allocation</CardTitle></CardHeader>
            <CardContent><PortfolioPie /></CardContent>
          </Card>
        </motion.div>
        <motion.div variants={fade} initial="hidden" animate="visible" custom={2} className="md:col-span-2">
          <Card>
            <CardHeader><CardTitle>Détails positions</CardTitle></CardHeader>
            <CardContent><PortfolioTable /></CardContent>
          </Card>
        </motion.div>
        <motion.div variants={fade} initial="hidden" animate="visible" custom={3}>
          <Card>
            <CardHeader><CardTitle>Risque (placeholder)</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-xs space-y-2 text-white/70">
                <li>Volatilité 30j: <span className="text-white">Élevée</span></li>
                <li>Corrélation BTC: <span className="text-white">0.78</span></li>
                <li>Exposition Layer1: <span className="text-white">62%</span></li>
                <li>Ratio Stablecoins: <span className="text-white">18%</span></li>
              </ul>
            </CardContent>
          </Card>
        </motion.div>
        <motion.div variants={fade} initial="hidden" animate="visible" custom={4}>
          <Card>
            <CardHeader><CardTitle>Suggestions IA (placeholder)</CardTitle></CardHeader>
            <CardContent className="text-xs text-white/70 leading-relaxed">
              Rééquilibrer légèrement vers des actifs à faible corrélation. Ajouter 5% stablecoins pour réduire la variance.
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </main>
  );
}
