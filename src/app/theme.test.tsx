import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { THEME_STORAGE_KEY, ThemeProvider, useTheme } from './theme';

const wrapper = ({ children }: { children: ReactNode }) => (
  <ThemeProvider>{children}</ThemeProvider>
);
const root = document.documentElement;

function addThemeColorMeta(media: string): HTMLMetaElement {
  const meta = document.createElement('meta');
  meta.name = 'theme-color';
  meta.media = media;
  document.head.append(meta);
  return meta;
}

function mockPrefersDark(matches: boolean) {
  vi.spyOn(window, 'matchMedia').mockImplementation((query: string) => ({
    matches: query === '(prefers-color-scheme: dark)' ? matches : false,
    media: query,
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(() => true),
  }));
}

describe('ThemeProvider', () => {
  beforeEach(() => mockPrefersDark(false));

  afterEach(() => {
    root.removeAttribute('data-theme');
    for (const meta of document.head.querySelectorAll('meta[name="theme-color"]')) meta.remove();
  });

  it('follows the system by default without a data-theme attribute', () => {
    const { result } = renderHook(useTheme, { wrapper });

    expect(result.current.preference).toBe('system');
    expect(result.current.resolved).toBe('light');
    expect(root).not.toHaveAttribute('data-theme');
  });

  it('resolves the system preference from the colour-scheme media query', () => {
    mockPrefersDark(true);
    const { result } = renderHook(useTheme, { wrapper });

    expect(result.current.resolved).toBe('dark');
    expect(root).not.toHaveAttribute('data-theme');
  });

  it('applies and persists an explicit choice, and "system" removes both again', () => {
    const { result } = renderHook(useTheme, { wrapper });

    act(() => result.current.setPreference('dark'));
    expect(result.current).toMatchObject({ preference: 'dark', resolved: 'dark' });
    expect(root).toHaveAttribute('data-theme', 'dark');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBe('dark');

    act(() => result.current.setPreference('system'));
    expect(root).not.toHaveAttribute('data-theme');
    expect(window.localStorage.getItem(THEME_STORAGE_KEY)).toBeNull();
  });

  it('restores the saved preference on start', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'light');
    mockPrefersDark(true);
    const { result } = renderHook(useTheme, { wrapper });

    expect(result.current).toMatchObject({ preference: 'light', resolved: 'light' });
    expect(root).toHaveAttribute('data-theme', 'light');
  });

  it('ignores unknown stored values', () => {
    window.localStorage.setItem(THEME_STORAGE_KEY, 'sepia');
    const { result } = renderHook(useTheme, { wrapper });

    expect(result.current.preference).toBe('system');
  });

  it('follows changes made in another tab', () => {
    const { result } = renderHook(useTheme, { wrapper });

    act(() => {
      window.localStorage.setItem(THEME_STORAGE_KEY, 'dark');
      window.dispatchEvent(
        new StorageEvent('storage', { key: THEME_STORAGE_KEY, newValue: 'dark' }),
      );
    });

    expect(result.current.preference).toBe('dark');
    expect(root).toHaveAttribute('data-theme', 'dark');
  });

  it('keeps <meta name="theme-color"> in step with the chosen theme', () => {
    const lightMeta = addThemeColorMeta('(prefers-color-scheme: light)');
    const darkMeta = addThemeColorMeta('(prefers-color-scheme: dark)');
    const { result } = renderHook(useTheme, { wrapper });

    expect(lightMeta.content).toBe('#f4f2ec');
    expect(darkMeta.content).toBe('#121110');

    act(() => result.current.setPreference('dark'));
    expect(lightMeta.content).toBe('#121110');
    expect(darkMeta.content).toBe('#121110');
  });
});
