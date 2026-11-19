export type RouteNavigationType = 'POP' | 'PUSH' | 'REPLACE';

export type RouteScrollAction = 'instant-top' | 'hash-target' | 'none';

export interface ResolveRouteScrollInput {
  pathname: string;
  hash: string;
  prevPathname: string | null;
  navigationType: RouteNavigationType;
}

/**
 * Determines how window scroll should behave on a React Router navigation.
 *
 * - Always jumps instantly to top when switching routes (`pathname` changed) or
 *   when explicitly pushing a route (e.g., tapping a mobile bottom nav button
 *   even if it matches the active route).
 * - Preserves scroll position on in-page `REPLACE` query-param updates
 *   (e.g., typing into search/filters on `/eventos` or `/bares`).
 * - Supports in-page anchor hashes other than `#top`.
 */
export function resolveRouteScrollAction({
  pathname,
  hash,
  prevPathname,
  navigationType,
}: ResolveRouteScrollInput): RouteScrollAction {
  const normalizedHash = hash.trim();

  if (normalizedHash && normalizedHash !== '#top') {
    return 'hash-target';
  }

  if (prevPathname === null) {
    return normalizedHash === '#top' ? 'instant-top' : 'none';
  }

  if (pathname !== prevPathname) {
    return 'instant-top';
  }

  if (normalizedHash === '#top') {
    return 'instant-top';
  }

  if (navigationType === 'PUSH') {
    return 'instant-top';
  }

  return 'none';
}

/**
 * Resets page scroll to (0, 0) immediately, bypassing `html { scroll-behavior: smooth; }`
 * so route transitions on mobile never get stuck mid-scroll or near the footer.
 */
export function scrollToTopInstant(): void {
  if (typeof window === 'undefined') return;

  try {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' as ScrollBehavior });
  } catch {
    window.scrollTo(0, 0);
  }

  if (typeof document !== 'undefined') {
    document.documentElement.scrollTop = 0;
    if (document.body) {
      document.body.scrollTop = 0;
    }
  }
}
