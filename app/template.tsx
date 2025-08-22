"use client";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { motionConfig } from "@/lib/motion";
import { usePathname } from "next/navigation";
import React from "react";

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const prefersReduced = useReducedMotion();
  const t = motionConfig(!!prefersReduced);
  const variants = prefersReduced ? {
    initial: { opacity: 1 },
    animate: { opacity: 1, transition: { duration: 0 } },
    exit: { opacity: 1, transition: { duration: 0 } }
  } : {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
    exit: { opacity: 0, y: -8, transition: { duration: 0.25, ease: 'easeIn' } }
  };
  return (
    <AnimatePresence mode="wait" initial={false}>
      <motion.div key={pathname} variants={variants} initial="initial" animate="animate" exit="exit">
        {children}
      </motion.div>
    </AnimatePresence>
  );
}
