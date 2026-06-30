import { useState, useEffect } from 'react';

export type CinematicPhase = 'intro' | 'alive';

export function useCinematicTimeline(introDurationMs = 3000) {
  const [phase, setPhase] = useState<CinematicPhase>('intro');

  useEffect(() => {
    // Check reduced motion for accessibility
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      setPhase('alive');
      return;
    }

    const timer = setTimeout(() => {
      setPhase('alive');
    }, introDurationMs);

    return () => clearTimeout(timer);
  }, [introDurationMs]);

  return phase;
}
