import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowDown, Check, RefreshCw } from 'lucide-react';
import {
  applyPullResistance,
  computePullProgress,
  getPullStatusLabel,
  PULL_MAX_DISTANCE,
  PULL_REFRESHING_HEIGHT,
  PULL_TRIGGER_THRESHOLD,
  resolvePullPhase,
  shouldStartPullGesture,
} from '../utils/pullToRefresh';

interface PullToRefreshProps {
  onRefresh: () => Promise<unknown>;
  isRefreshing?: boolean;
  children: React.ReactNode;
  className?: string;
}

function getWindowScrollTop(): number {
  if (typeof window === 'undefined') return 0;
  return Math.max(window.scrollY || 0, document.documentElement?.scrollTop || 0);
}

function isExcludedTouchTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      'input, textarea, select, [contenteditable="true"], [role="dialog"], .leaflet-container, [data-no-pull-refresh="true"]',
    ),
  );
}

export const PullToRefresh: React.FC<PullToRefreshProps> = ({
  onRefresh,
  isRefreshing: externalRefreshing = false,
  children,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const startYRef = useRef<number | null>(null);
  const startXRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);
  const gestureCancelledRef = useRef(false);
  const pullDistanceRef = useRef(0);
  const completeTimerRef = useRef<number | null>(null);

  const [pullDistance, setPullDistance] = useState(0);
  const [internalRefreshing, setInternalRefreshing] = useState(false);
  const [justCompleted, setJustCompleted] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const refreshing = externalRefreshing || internalRefreshing;
  const refreshingRef = useRef(refreshing);
  refreshingRef.current = refreshing;

  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;

  const clearCompleteTimer = useCallback(() => {
    if (completeTimerRef.current !== null) {
      window.clearTimeout(completeTimerRef.current);
      completeTimerRef.current = null;
    }
  }, []);

  const triggerRefresh = useCallback(async () => {
    if (refreshingRef.current) return;
    clearCompleteTimer();
    setJustCompleted(false);
    setInternalRefreshing(true);
    setPullDistance(0);
    pullDistanceRef.current = 0;

    try {
      await onRefreshRef.current();
    } finally {
      setInternalRefreshing(false);
      setJustCompleted(true);
      completeTimerRef.current = window.setTimeout(() => {
        setJustCompleted(false);
        completeTimerRef.current = null;
      }, 1250);
    }
  }, [clearCompleteTimer]);

  // Prevent browser-native pull-to-refresh from hijacking our custom in-app gesture while active
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtmlOverscroll = html.style.overscrollBehaviorY;
    const prevBodyOverscroll = body.style.overscrollBehaviorY;

    html.style.overscrollBehaviorY = 'contain';
    body.style.overscrollBehaviorY = 'contain';

    return () => {
      html.style.overscrollBehaviorY = prevHtmlOverscroll;
      body.style.overscrollBehaviorY = prevBodyOverscroll;
    };
  }, []);

  useEffect(() => {
    return () => clearCompleteTimer();
  }, [clearCompleteTimer]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const resetTouchTracking = () => {
      startYRef.current = null;
      startXRef.current = null;
      isPullingRef.current = false;
      gestureCancelledRef.current = false;
      setIsDragging(false);
    };

    const handleTouchStart = (e: TouchEvent) => {
      if (refreshingRef.current || e.touches.length !== 1) {
        resetTouchTracking();
        return;
      }
      if (getWindowScrollTop() > 1 || isExcludedTouchTarget(e.target)) {
        resetTouchTracking();
        return;
      }
      const touch = e.touches[0];
      startYRef.current = touch.clientY;
      startXRef.current = touch.clientX;
      isPullingRef.current = false;
      gestureCancelledRef.current = false;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (
        refreshingRef.current ||
        gestureCancelledRef.current ||
        startYRef.current === null ||
        startXRef.current === null ||
        e.touches.length !== 1
      ) {
        return;
      }

      const touch = e.touches[0];
      const deltaY = touch.clientY - startYRef.current;
      const deltaX = touch.clientX - startXRef.current;

      if (!isPullingRef.current) {
        // Cancel pull tracking immediately if user is scrolling upward or swiping horizontally (carousels)
        if (
          getWindowScrollTop() > 1 ||
          deltaY < -4 ||
          (Math.abs(deltaX) > 10 && Math.abs(deltaX) >= Math.abs(deltaY))
        ) {
          gestureCancelledRef.current = true;
          return;
        }

        if (
          !shouldStartPullGesture({
            scrollTop: getWindowScrollTop(),
            deltaY,
            deltaX,
            isDisabled: refreshingRef.current,
          })
        ) {
          return;
        }

        isPullingRef.current = true;
        setIsDragging(true);
        setJustCompleted(false);
        clearCompleteTimer();
      }

      if (deltaY <= 0) {
        pullDistanceRef.current = 0;
        setPullDistance(0);
        return;
      }

      // Engage custom pull smoothly without triggering native page overscroll bounce
      if (e.cancelable) {
        e.preventDefault();
      }

      const nextDistance = applyPullResistance(deltaY, PULL_MAX_DISTANCE);
      pullDistanceRef.current = nextDistance;
      setPullDistance(nextDistance);
    };

    const handleTouchEnd = () => {
      const wasPulling = isPullingRef.current;
      const finalDistance = pullDistanceRef.current;
      resetTouchTracking();

      if (!wasPulling) return;

      if (finalDistance >= PULL_TRIGGER_THRESHOLD) {
        void triggerRefresh();
      } else {
        pullDistanceRef.current = 0;
        setPullDistance(0);
      }
    };

    el.addEventListener('touchstart', handleTouchStart, { passive: true });
    el.addEventListener('touchmove', handleTouchMove, { passive: false });
    el.addEventListener('touchend', handleTouchEnd, { passive: true });
    el.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    return () => {
      el.removeEventListener('touchstart', handleTouchStart);
      el.removeEventListener('touchmove', handleTouchMove);
      el.removeEventListener('touchend', handleTouchEnd);
      el.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [clearCompleteTimer, triggerRefresh]);

  const phase = resolvePullPhase({
    pullDistance,
    threshold: PULL_TRIGGER_THRESHOLD,
    isRefreshing: internalRefreshing,
    justCompleted,
  });

  const progress = computePullProgress(pullDistance, PULL_TRIGGER_THRESHOLD);
  const label = getPullStatusLabel(phase);

  const trayHeight =
    phase === 'refreshing' || phase === 'complete'
      ? PULL_REFRESHING_HEIGHT
      : phase === 'pulling' || phase === 'armed'
        ? Math.max(0, Math.round(pullDistance))
        : 0;

  const isVisible = phase !== 'idle';

  return (
    <div
      ref={containerRef}
      className={`relative overscroll-y-contain ${className}`}
      data-pull-to-refresh="true"
    >
      {/* Top Pull-to-Refresh Tray (collapses to 0px when idle) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-pull-phase={phase}
        style={{ height: `${trayHeight}px` }}
        className={`w-full overflow-hidden bg-[#101012] flex items-center justify-center select-none ${
          isVisible ? 'border-b border-[#28282E]' : 'border-b border-transparent'
        } ${isDragging ? 'transition-none' : 'transition-[height,opacity,border-color] duration-200 ease-out'}`}
      >
        <div
          className={`flex items-center gap-2.5 px-4 transition-opacity duration-150 ${
            isVisible ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <span
            aria-hidden="true"
            className={`w-7 h-7 rounded-full border flex items-center justify-center shrink-0 transition-colors ${
              phase === 'complete'
                ? 'bg-[#34D399]/15 border-[#34D399]/60 text-[#34D399]'
                : phase === 'armed' || phase === 'refreshing'
                  ? 'bg-[#FF5A36]/15 border-[#FF5A36]/70 text-[#FF5A36]'
                  : 'bg-[#1C1C20] border-[#28282E] text-[#98989F]'
            }`}
          >
            {phase === 'refreshing' ? (
              <RefreshCw className="w-3.5 h-3.5 motion-safe:animate-spin" />
            ) : phase === 'complete' ? (
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
            ) : (
              <ArrowDown
                className="w-3.5 h-3.5 transition-transform duration-150"
                style={{
                  transform: `rotate(${Math.round(progress * 180)}deg)`,
                }}
              />
            )}
          </span>
          <span
            className={`text-xs font-semibold tracking-wide whitespace-nowrap ${
              phase === 'complete'
                ? 'text-[#34D399]'
                : phase === 'armed'
                  ? 'text-[#FF5A36]'
                  : 'text-[#E8E8E6]'
            }`}
          >
            {label}
          </span>
        </div>
      </div>

      {children}
    </div>
  );
};
