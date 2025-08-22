"use client";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

const quizzes = [
  { q: 'Qu’est-ce que la diversification ?', a: 'Répartir le capital sur plusieurs actifs pour réduire le risque.' },
  { q: 'Que signifie DCA ?', a: 'Investir un montant fixe à intervalle régulier.' },
];

export default function ChallengesPage() {
  return (
    <main className="max-w-5xl mx-auto px-5 py-12">
      <motion.h1 initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="text-3xl font-semibold tracking-tight mb-8">Challenges & Quiz</motion.h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Quiz rapides</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-4 text-sm">
              {quizzes.map((q,i)=>(
                <li key={i} className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <div className="font-medium mb-1">{q.q}</div>
                  <div className="text-white/60 text-xs">{q.a}</div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Missions du jour</CardTitle></CardHeader>
          <CardContent className="text-sm text-white/70 space-y-2">
            <p>1. Vérifier la part stablecoins &lt; 25%.</p>
            <p>2. Calculer l'exposition Layer 1 vs DeFi.</p>
            <p>3. Lire une définition: <em>volatilité implicite</em>.</p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
