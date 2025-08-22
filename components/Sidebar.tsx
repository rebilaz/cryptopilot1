"use client";
import { motion } from "framer-motion";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <motion.div initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ duration: .5, ease:'easeOut' }} className="sidebar-section">
        <h4 className="text-xs font-medium tracking-wide text-white/60">Progression</h4>
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-white/60">Niveau</span>
            <span className="font-semibold">3</span>
          </div>
          <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-indigo-400 to-violet-400" />
          </div>
          <p className="text-[11px] leading-relaxed text-white/50">Continue les missions pour monter en compétence progressivement.</p>
        </div>
      </motion.div>
      <motion.div initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay:.05, duration:.5, ease:'easeOut' }} className="sidebar-section">
        <h4 className="text-xs font-medium tracking-wide text-white/60">Missions du jour</h4>
        <ul className="mt-2 space-y-2 text-xs">
          <li className="flex items-start gap-2"><span className="mt-0.5 size-2 rounded-full bg-indigo-400" />Vérifier l'équilibre stablecoins</li>
          <li className="flex items-start gap-2"><span className="mt-0.5 size-2 rounded-full bg-indigo-400" />Analyser la corrélation ETH/BTC</li>
          <li className="flex items-start gap-2 text-white/50"><span className="mt-0.5 size-2 rounded-full bg-white/20" />Lire le guide des risques DeFi</li>
        </ul>
      </motion.div>
      <motion.div initial={{ opacity:0, x:-12 }} animate={{ opacity:1, x:0 }} transition={{ delay:.1, duration:.5, ease:'easeOut' }} className="sidebar-section">
        <h4 className="text-xs font-medium tracking-wide text-white/60">Coach IA</h4>
        <Card className="p-3 bg-white/5 border-white/10 shadow-none hover:shadow-soft">
          <CardHeader className="mb-2">
            <CardTitle className="text-sm">Conseil express</CardTitle>
          </CardHeader>
          <CardContent className="text-[11px] leading-relaxed text-white/60">
            Ta diversification est correcte mais ton exposition aux layer 1 reste élevée. Rééquilibre doucement sur 2 semaines.
          </CardContent>
        </Card>
      </motion.div>
    </aside>
  );
}
