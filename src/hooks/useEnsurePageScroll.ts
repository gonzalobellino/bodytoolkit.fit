import { useEffect } from 'react';

export function useEnsurePageScroll(enabled: boolean = true) {
  useEffect(() => {
    if (!enabled) return;

    const body = document.body;
    const root = document.documentElement;
    const prevBodyOverflow = body.style.overflowY;
    const prevRootOverflow = root.style.overflowY;

    const computedBodyOverflow = window.getComputedStyle(body).overflowY;
    const computedRootOverflow = window.getComputedStyle(root).overflowY;
    const shouldOverride =
      computedBodyOverflow === 'hidden' || computedRootOverflow === 'hidden';

    if (shouldOverride) {
      body.style.overflowY = 'auto';
      root.style.overflowY = 'auto';
    }

    return () => {
      if (shouldOverride) {
        body.style.overflowY = prevBodyOverflow;
        root.style.overflowY = prevRootOverflow;
      }
    };
  }, [enabled]);
}
