import { useCallback, useSyncExternalStore } from 'react';

/** Matches Tailwind's `lg` breakpoint, where the sidebar layout takes over. */
export const DESKTOP_MEDIA_QUERY = '(min-width: 64rem)';

/** Whether a CSS media query currently matches; updates when it changes. */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const mediaQueryList = window.matchMedia(query);
      mediaQueryList.addEventListener('change', onChange);
      return () => mediaQueryList.removeEventListener('change', onChange);
    },
    [query],
  );
  const getSnapshot = () => window.matchMedia(query).matches;
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
