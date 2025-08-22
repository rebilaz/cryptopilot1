"use client";
import { ReactNode, useId } from "react";
import { cn } from "@/lib/utils";
import { motion, useReducedMotion } from "framer-motion";
import { motionConfig } from "@/lib/motion";

/**
 * WatchCard – gabarit unifié "Apple Watch style" pour widgets CryptoPilot
 * - Halo discret décoratif
 * - Header cohérent (icône + titre + sous-titre)
 * - Actions optionnelles (ex: bouton, menu) alignées à droite du header
 * - Accessibilité: section avec aria-label et aria-describedby si description fournie
 */
export interface WatchCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
  ariaDescription?: string;
}

export function WatchCard({ title, subtitle, icon, actions, className, children, ariaDescription }: WatchCardProps) {
  const descId = useId();
  const prefersReduced = !!useReducedMotion();
  const t = motionConfig(prefersReduced);
  return (
    <motion.section
      role="region"
      aria-label={title}
      aria-describedby={ariaDescription ? descId : undefined}
      initial={prefersReduced ? { opacity: 1 } : { opacity: 0, y: 14 }}
      animate={prefersReduced ? { opacity: 1 } : { opacity: 1, y: 0 }}
      transition={t}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 dark:bg-white/5 px-4 py-4 md:px-5 md:py-5",
        "shadow-[0_0_0_1px_rgba(255,255,255,0.03),0_4px_12px_-2px_rgba(0,0,0,0.4),0_8px_32px_-4px_rgba(0,0,0,0.25)]",
        "backdrop-blur supports-[backdrop-filter]:bg-white/5 hover:shadow-md transition will-change-transform",
        "hover:translate-y-[1px] focus-within:ring-2 focus-within:ring-indigo-400/50",
        className
      )}
    >
      {/* Halo décoratif */}
      <div aria-hidden className={cn("pointer-events-none absolute inset-0 watch-glow", prefersReduced && "opacity-90")} />
      <header className="relative z-10 mb-3 flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          {icon && <div className="text-xl shrink-0">{icon}</div>}
          <div className="leading-tight">
            <h2 className="text-sm font-semibold tracking-wide">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[11px] uppercase tracking-wide text-white/55 dark:text-white/55">{subtitle}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </header>
      {ariaDescription && (
        <p id={descId} className="sr-only">{ariaDescription}</p>
      )}
      <div className="relative z-10">{children}</div>
    </motion.section>
  );
}

export default WatchCard;
