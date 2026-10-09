import { useCallback, useRef, useState } from 'react';

/**
 * Tracks the rendered content width of an element with a ResizeObserver.
 * `width` is null until a non-zero width has been measured (e.g. in jsdom), so callers
 * can fall back to a default. A ref callback (not an effect) measures synchronously at
 * commit time, so the first paint already uses the real width.
 */
export function useElementWidth<T extends Element>() {
  const [width, setWidth] = useState<number | null>(null);
  const nodeRef = useRef<T | null>(null);

  const ref = useCallback((node: T | null) => {
    nodeRef.current = node;
    if (!node) return;
    // Flooring keeps the chart from ever being a sub-pixel wider than its container.
    const update = (next: number) => {
      const floored = Math.floor(next);
      if (floored > 0) setWidth(floored);
    };
    update(node.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) update(entry.contentRect.width);
    });
    observer.observe(node);
    return () => {
      observer.disconnect();
      nodeRef.current = null;
    };
  }, []);

  return { ref, nodeRef, width };
}
