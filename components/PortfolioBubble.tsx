"use client";
import { motion } from "framer-motion";
import { useState } from "react";

export function PortfolioBubble() {
  const [open,setOpen] = useState(false);
  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <motion.div initial={{ opacity:0, scale:.9 }} animate={{ opacity:1, scale:1 }} exit={{ opacity:0 }}
          className="mb-3 w-64 rounded-2xl border border-white/10 bg-white/10 backdrop-blur p-4 text-xs text-white/80 shadow-soft">
          <div className="font-medium mb-1">Mini coach</div>
          <p className="leading-relaxed">Ton exposition BTC est élevée (placeholder). Pense à équilibrer avec des actifs défensifs.</p>
          <button onClick={()=>setOpen(false)} className="mt-3 text-[11px] underline text-white/60 hover:text-white">Fermer</button>
        </motion.div>
      )}
      <button onClick={()=>setOpen(o=>!o)} aria-label="Ouvrir coach portefeuille"
        className="rounded-full bg-gradient-to-br from-indigo-500 to-violet-500 p-4 shadow-soft hover:scale-105 active:scale-95 transition-transform">
        📊
      </button>
    </div>
  );
}
