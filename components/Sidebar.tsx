"use client";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function Sidebar() {
  return (
  <aside className="sidebar">
      <motion.div initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ duration: .5, ease:'easeOut' }} className="sidebar-section">
        <h4 className="text-xs font-medium tracking-wide text-neutral-500">Progression</h4>
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-neutral-500">Niveau</span>
            <span className="font-semibold">3</span>
          </div>
          <div className="h-2 w-full rounded-full bg-neutral-200 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-neutral-900" />
          </div>
          <p className="text-[11px] leading-relaxed text-neutral-500">Continue les missions pour monter en compétence progressivement.</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay:.05, duration:.5, ease:'easeOut' }} className="sidebar-section">
        <h4 className="text-xs font-medium tracking-wide text-neutral-500">Missions du jour</h4>
        <ul className="mt-2 space-y-2 text-xs">
          <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-800" />Vérifier l'équilibre stablecoins</li>
          <li className="flex items-start gap-2"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-800" />Analyser la corrélation ETH/BTC</li>
          <li className="flex items-start gap-2 text-neutral-400"><span className="mt-1 h-1.5 w-1.5 rounded-full bg-neutral-300" />Lire le guide des risques DeFi</li>
        </ul>
      </motion.div>
      <motion.div initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay:.1, duration:.5, ease:'easeOut' }} className="sidebar-section">
        <h4 className="text-xs font-medium tracking-wide text-neutral-500">Coach IA</h4>
        <Card className="p-3 bg-white border border-neutral-200 shadow-none">
          <CardHeader className="mb-2">
            <CardTitle className="text-sm text-neutral-900">Conseil express</CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] leading-relaxed text-neutral-600">
            Ta diversification est correcte mais ton exposition aux layer 1 reste élevée. Rééquilibre progressivement sur 2 semaines.
          </CardContent>
        </Card>
      </motion.div>
    </aside>
  );
}
