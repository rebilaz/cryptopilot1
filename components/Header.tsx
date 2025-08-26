"use client";
import Link from "next/link";
import ThemeToggle from "@/components/ThemeToggle";
import { AuthButtons } from '@/components/auth/AuthButtons';
import { motion } from "framer-motion";

export function Header() {
  return (
    <motion.header
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
  className="sticky top-0 z-40 w-full border-b border-neutral-200 bg-white/70 backdrop-blur"
    >
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4">
    <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-wide text-neutral-800 hover:text-black">
      <span className="text-lg" aria-hidden>◎</span>
      <span className="hidden sm:inline">CryptoPilot</span>
        </Link>
        <div className="flex items-center gap-6">
          <nav className="hidden md:flex items-center gap-6 text-xs text-neutral-600" aria-label="Navigation principale">
            <Link href="/" className="hover:text-black transition-colors">Dashboard</Link>
            <Link href="/analysis" className="hover:text-black transition-colors">Analyse</Link>
            <Link href="/progression" className="hover:text-black transition-colors">Progression</Link>
            <Link href="/challenges" className="hover:text-black transition-colors">Challenges</Link>
          </nav>
          <AuthButtons />
          <ThemeToggle />
        </div>
      </div>
    </motion.header>
  );
}
