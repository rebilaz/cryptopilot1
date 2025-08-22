// Helper de configuration de transition selon préférence utilisateur (réduction des animations)
// Usage: const prefersReduced = useReducedMotion(); const t = motionConfig(prefersReduced);
export function motionConfig(reduced: boolean) {
  return reduced
    ? { duration: 0, opacity: 1, y: 0 }
    : { duration: 0.25, ease: "easeInOut" };
}

// Variante utilitaire pour composer rapidement les props initial/animate
export function fadeLift(prefersReduced: boolean, delay = 0) {
  if (prefersReduced) {
    return {
      initial: { opacity: 1 },
      animate: { opacity: 1 },
      transition: { duration: 0 }
    } as const;
  }
  return {
    initial: { opacity: 0, y: 14 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: 'easeOut', delay }
  } as const;
}
