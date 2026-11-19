import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation, useNavigationType } from 'react-router-dom';
import { resolveRouteScrollAction, scrollToTopInstant } from '../utils/scrollNavigation';

/**
 * Ensures every route transition (especially from the mobile bottom navigation
 * bar or footer links) lands cleanly at the top of the page.
 */
export const ScrollToTop: React.FC = () => {
  const location = useLocation();
  const navigationType = useNavigationType();
  const prevPathnameRef = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined' || !('scrollRestoration' in window.history)) {
      return;
    }
    const previous = window.history.scrollRestoration;
    window.history.scrollRestoration = 'manual';
    return () => {
      window.history.scrollRestoration = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const action = resolveRouteScrollAction({
      pathname: location.pathname,
      hash: location.hash,
      prevPathname: prevPathnameRef.current,
      navigationType,
    });

    prevPathnameRef.current = location.pathname;

    if (action === 'none') {
      return;
    }

    if (action === 'hash-target') {
      const targetId = location.hash.slice(1);
      const targetEl = targetId ? document.getElementById(targetId) : null;
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'auto', block: 'start' });
        return;
      }
    }

    // Release focus if the user navigated from a footer link so mobile browsers
    // do not scroll the new page back down to keep the persistent footer focused.
    const activeEl = document.activeElement;
    if (activeEl instanceof HTMLElement && activeEl.closest('footer')) {
      activeEl.blur();
    }

    // Immediate reset before paint, plus a post-frame safeguard for lazy-loaded routes
    scrollToTopInstant();
    const rafId = window.requestAnimationFrame(() => {
      scrollToTopInstant();
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [location.pathname, location.hash, location.key, navigationType]);

  return null;
};
