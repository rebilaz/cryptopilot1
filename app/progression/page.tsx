"use client";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import ProgressionCard from "@/components/ProgressionCard";
import LevelBadge from "@/components/LevelBadge";

export default function ProgressionPage() {
  const levels = [
    { name: 'Explorer', desc: 'Découverte et bases fondamentales.' },
    { name: 'Stratège', desc: 'Allocation, diversification, gestion du risque.' },
    { name: 'Analyste', desc: 'Lecture on-chain, corrélations, métriques avancées.' },
    { name: 'Trader', desc: 'Timing, dynamique, optimisation fine (aucun signal fourni).' },
  ];
  return (
    <main className="max-w-5xl mx-auto px-5 py-12">
      <motion.h1 initial={{ opacity:0, y:12 }} animate={{ opacity:1, y:0 }} className="text-3xl font-semibold tracking-tight mb-8">Progression</motion.h1>
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Niveaux</CardTitle></CardHeader>
          <CardContent>
            <ul className="space-y-4 text-sm">
              {levels.map((l,i)=>(
                <li key={l.name} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${i===0?'bg-emerald-500 text-white':'bg-white/10 text-white/60'}`}>{i+1}</div>
                    {i<levels.length-1 && <div className="w-px flex-1 bg-white/10" />}
                  </div>
                  <div className="flex-1">
                    <div className="font-medium">{l.name}</div>
                    <p className="text-white/60 text-xs leading-relaxed">{l.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>État actuel</CardTitle></CardHeader>
          <CardContent>
            <div className="flex items-center gap-3 mb-4">
              <LevelBadge />
              <span className="text-sm text-white/70">Tu progresses régulièrement 👏</span>
            </div>
            <ProgressionCard />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
