"use client";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { motion } from "framer-motion";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="sticky top-0 z-40 w-full border-b border-white/10 backdrop-blur bg-background/70"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 text-sm font-medium tracking-wide text-white/80 hover:text-white">
            <span className="text-lg">🚀</span>
            <span className="hidden sm:inline">CryptoPilot</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6 text-xs text-white/60" aria-label="Navigation principale">
            <Link href="/" className="hover:text-white transition-colors">Dashboard</Link>
            <Link href="/analysis" className="hover:text-white transition-colors">Analyse</Link>
            <Link href="/progression" className="hover:text-white transition-colors">Progression</Link>
            <Link href="/challenges" className="hover:text-white transition-colors">Challenges</Link>
          </nav>
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
}
