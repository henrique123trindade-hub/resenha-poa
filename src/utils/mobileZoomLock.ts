/**
 * Mobile page zoom lock (covers iOS Safari where user-scalable=no is ignored).
 * Blocks page-level pinch gestures (gesturestart/change/end + multi-touch pinch)
 * while preserving single-finger scrolling, carousels, pull-to-refresh, rapid button taps,
 * and interactive Leaflet map touch gestures.
 */

export interface TouchZoomCheckInput {
  touchCount: number;
  scale?: number;
  isInsideMap: boolean;
}

export function shouldBlockTouchZoom({
  touchCount,
  scale,
  isInsideMap,
}: TouchZoomCheckInput): boolean {
  if (isInsideMap) return false;
  if (touchCount > 1) return true;
  if (typeof scale === 'number' && Number.isFinite(scale) && scale !== 1) {
    return true;
  }
  return false;
}

export function isInsideInteractiveMap(target: EventTarget | null): boolean {
  if (typeof Element === 'undefined' || !(target instanceof Element)) return false;
  return Boolean(target.closest('.leaflet-container'));
}

export function installMobileZoomLock(): () => void {
  if (typeof document === 'undefined') {
    return () => {};
  }

  const preventGestureZoom = (event: Event) => {
    if (event.cancelable) {
      event.preventDefault();
    }
  };

  const handleTouch = (event: TouchEvent) => {
    const safariScale = (event as TouchEvent & { scale?: number }).scale;
    const block = shouldBlockTouchZoom({
      touchCount: event.touches.length,
      scale: safariScale,
      isInsideMap: isInsideInteractiveMap(event.target),
    });

    if (block && event.cancelable) {
      event.preventDefault();
    }
  };

  document.addEventListener('gesturestart', preventGestureZoom, { passive: false });
  document.addEventListener('gesturechange', preventGestureZoom, { passive: false });
  document.addEventListener('gestureend', preventGestureZoom, { passive: false });
  document.addEventListener('touchstart', handleTouch, { passive: false });
  document.addEventListener('touchmove', handleTouch, { passive: false });

  return () => {
    document.removeEventListener('gesturestart', preventGestureZoom);
    document.removeEventListener('gesturechange', preventGestureZoom);
    document.removeEventListener('gestureend', preventGestureZoom);
    document.removeEventListener('touchstart', handleTouch);
    document.removeEventListener('touchmove', handleTouch);
  };
}
