import React, { useEffect, useRef, useState } from 'react';
import { getEventCardRevealClasses } from '../utils/motionClasses';

interface EventCardRevealProps {
  index: number;
  immediate?: boolean;
  className?: string;
  children: React.ReactNode;
}

function getInitialReducedMotion(): boolean {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Wraps homepage EventCard instances with a smooth Tailwind fade-in animation.
 * Keeps `.card-lift` hover transforms on the inner `<article>` unaffected and
 * strictly honors `prefers-reduced-motion: reduce`.
 */
export const EventCardReveal: React.FC<EventCardRevealProps> = ({
  index,
  immediate = false,
  className = '',
  children,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(
    getInitialReducedMotion,
  );
  const [isVisible, setIsVisible] = useState<boolean>(
    () => immediate || getInitialReducedMotion() || typeof IntersectionObserver === 'undefined',
  );

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }

    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handleChange = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
      if (event.matches) {
        setIsVisible(true);
      }
    };

    setPrefersReducedMotion(mediaQuery.matches);
    if (mediaQuery.matches) {
      setIsVisible(true);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    if (isVisible || prefersReducedMotion) {
      return;
    }

    const node = containerRef.current;
    if (!node || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        threshold: 0.08,
        rootMargin: '0px 0px -24px 0px',
      },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [isVisible, prefersReducedMotion]);

  const revealClasses = getEventCardRevealClasses({
    isVisible,
    index,
    prefersReducedMotion,
  });

  return (
    <div
      ref={containerRef}
      data-event-card-reveal={isVisible || prefersReducedMotion ? 'visible' : 'hidden'}
      className={`${revealClasses} ${className}`.trim()}
    >
      {children}
    </div>
  );
};
