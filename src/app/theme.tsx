import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useMediaQuery } from '@/hooks/use-media-query';

/** Keep in sync with `public/theme-init.js`, which applies the theme before first paint. */
export const THEME_STORAGE_KEY = 'stint:theme';

export type ThemePreference = 'system' | 'light' | 'dark';
type ResolvedTheme = 'light' | 'dark';

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
}

/** Browser chrome colours (`<meta name="theme-color">`); keep in sync with `--canvas` in index.css. */
const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#f4f2ec', dark: '#121110' };

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStoredPreference(): ThemePreference {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    return value === 'light' || value === 'dark' ? value : 'system';
  } catch {
    // Storage can be blocked (private mode, strict cookie settings): follow the OS.
    return 'system';
  }
}

function storePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') window.localStorage.removeItem(THEME_STORAGE_KEY);
    else window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Without storage the choice still applies until the tab is closed.
  }
}

function syncThemeColorMeta(preference: ThemePreference, resolved: ResolvedTheme): void {
  const metas = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]');
  for (const meta of metas) {
    // With "system", each tag keeps the colour of the scheme named in its media query.
    const theme =
      preference === 'system' ? (meta.media.includes('dark') ? 'dark' : 'light') : resolved;
    meta.content = THEME_COLORS[theme];
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  const resolved: ResolvedTheme =
    preference === 'system' ? (prefersDark ? 'dark' : 'light') : preference;

  // Layout effect: switch the attribute before paint so the new theme never flashes.
  useLayoutEffect(() => {
    const root = document.documentElement;
    if (preference === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', preference);
  }, [preference]);

  useEffect(() => {
    syncThemeColorMeta(preference, resolved);
  }, [preference, resolved]);

  // Follow theme changes made in other tabs.
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key === THEME_STORAGE_KEY || event.key === null) {
        setPreferenceState(readStoredPreference());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    storePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext value={value}>{children}</ThemeContext>;
}

// eslint-disable-next-line react-refresh/only-export-components -- the spec colocates the hook with its provider
export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used inside <ThemeProvider>');
  return context;
}
