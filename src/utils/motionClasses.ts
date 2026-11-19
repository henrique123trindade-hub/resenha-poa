const EVENT_FADE_DELAY_CLASSES = [
  'motion-safe:[animation-delay:0ms]',
  'motion-safe:[animation-delay:65ms]',
  'motion-safe:[animation-delay:130ms]',
  'motion-safe:[animation-delay:195ms]',
  'motion-safe:[animation-delay:260ms]',
  'motion-safe:[animation-delay:325ms]',
] as const;

export function getEventCardDelayClass(index: number): string {
  const safeIndex = Number.isFinite(index) ? Math.max(0, Math.floor(index)) : 0;
  const clamped = Math.min(safeIndex, EVENT_FADE_DELAY_CLASSES.length - 1);
  return EVENT_FADE_DELAY_CLASSES[clamped];
}

export interface EventCardRevealClassOptions {
  isVisible: boolean;
  index: number;
  prefersReducedMotion: boolean;
}

/**
 * Generates Tailwind utility classes for smooth, staggered homepage event card
 * fade-ins while strictly respecting `prefers-reduced-motion: reduce`.
 */
export function getEventCardRevealClasses({
  isVisible,
  index,
  prefersReducedMotion,
}: EventCardRevealClassOptions): string {
  if (prefersReducedMotion) {
    return 'opacity-100 translate-y-0 motion-reduce:animate-none motion-reduce:transition-none';
  }

  if (isVisible) {
    const delayClass = getEventCardDelayClass(index);
    return `motion-safe:animate-event-fade-in ${delayClass} motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:translate-y-0`;
  }

  return 'motion-safe:opacity-0 motion-safe:translate-y-3 motion-reduce:opacity-100 motion-reduce:translate-y-0 motion-reduce:animate-none';
}
