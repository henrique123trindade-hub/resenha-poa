export type PullRefreshPhase = 'idle' | 'pulling' | 'armed' | 'refreshing' | 'complete';

export const PULL_TRIGGER_THRESHOLD = 72;
export const PULL_MAX_DISTANCE = 116;
export const PULL_ACTIVATION_SLOP = 10;
export const PULL_REFRESHING_HEIGHT = 56;

/**
 * Applies smooth rubber-band resistance so downward drags feel responsive near 0
 * and progressively heavier as they approach `maxDistance`.
 */
export function applyPullResistance(
  rawDeltaY: number,
  maxDistance: number = PULL_MAX_DISTANCE,
): number {
  if (!Number.isFinite(rawDeltaY) || rawDeltaY <= 0) return 0;
  if (!Number.isFinite(maxDistance) || maxDistance <= 0) return 0;
  const damped = maxDistance * (1 - Math.exp(-rawDeltaY / (maxDistance * 1.45)));
  return Math.min(maxDistance, Math.round(damped * 10) / 10);
}

/**
 * Returns normalized pull progress in [0, 1] relative to the refresh trigger threshold.
 */
export function computePullProgress(
  pullDistance: number,
  threshold: number = PULL_TRIGGER_THRESHOLD,
): number {
  if (!Number.isFinite(pullDistance) || pullDistance <= 0) return 0;
  if (!Number.isFinite(threshold) || threshold <= 0) return 1;
  return Math.min(1, Math.max(0, pullDistance / threshold));
}

export interface PullStartCheckInput {
  scrollTop: number;
  deltaY: number;
  deltaX: number;
  isDisabled?: boolean;
  isExcludedTarget?: boolean;
}

/**
 * Determines whether a touch gesture should engage pull-to-refresh.
 * Requires the page to be at the top, downward motion exceeding slop,
 * and clear vertical intent so horizontal carousels and map pans stay uninterrupted.
 */
export function shouldStartPullGesture(input: PullStartCheckInput): boolean {
  const { scrollTop, deltaY, deltaX, isDisabled = false, isExcludedTarget = false } = input;
  if (isDisabled || isExcludedTarget) return false;
  if (scrollTop > 1) return false;
  if (deltaY <= PULL_ACTIVATION_SLOP) return false;
  return Math.abs(deltaY) > Math.abs(deltaX) * 1.35;
}

export interface PullPhaseInput {
  pullDistance: number;
  threshold?: number;
  isRefreshing: boolean;
  justCompleted: boolean;
}

export function resolvePullPhase(input: PullPhaseInput): PullRefreshPhase {
  const {
    pullDistance,
    threshold = PULL_TRIGGER_THRESHOLD,
    isRefreshing,
    justCompleted,
  } = input;

  if (isRefreshing) return 'refreshing';
  if (justCompleted) return 'complete';
  if (pullDistance >= threshold) return 'armed';
  if (pullDistance > 0) return 'pulling';
  return 'idle';
}

export function getPullStatusLabel(phase: PullRefreshPhase): string {
  switch (phase) {
    case 'pulling':
      return 'Puxe para atualizar os rolês';
    case 'armed':
      return 'Solte para atualizar';
    case 'refreshing':
      return 'Atualizando rolês de POA...';
    case 'complete':
      return 'Catálogo atualizado';
    case 'idle':
    default:
      return '';
  }
}
