import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDocumentTitle, useLiveDocumentTitle } from './use-document-title';

describe('useDocumentTitle', () => {
  it('composes "Title · Stint" and falls back to the app name on unmount', () => {
    const { rerender, unmount } = renderHook(({ title }) => useDocumentTitle(title), {
      initialProps: { title: 'Projects' },
    });
    expect(document.title).toBe('Projects · Stint');

    rerender({ title: 'Clients' });
    expect(document.title).toBe('Clients · Stint');

    unmount();
    expect(document.title).toBe('Stint');
  });

  it('lets the most recently mounted page title win and restores the previous one', () => {
    const outer = renderHook(() => useDocumentTitle('Invoices'));
    const inner = renderHook(() => useDocumentTitle('INV-2026-004'));
    expect(document.title).toBe('INV-2026-004 · Stint');

    inner.unmount();
    expect(document.title).toBe('Invoices · Stint');
    outer.unmount();
  });

  it('shows a live title over the page title and restores the page title afterwards', () => {
    const page = renderHook(() => useDocumentTitle('Projects'));
    const live = renderHook<void, { title: string | null }>(
      ({ title }) => useLiveDocumentTitle(title),
      {
        initialProps: { title: '● 0:00:05 · Writing' },
      },
    );
    expect(document.title).toBe('● 0:00:05 · Writing');

    live.rerender({ title: '● 0:00:06 · Writing' });
    expect(document.title).toBe('● 0:00:06 · Writing');

    live.rerender({ title: null });
    expect(document.title).toBe('Projects · Stint');

    live.rerender({ title: '● 0:00:07 · Writing' });
    live.unmount();
    expect(document.title).toBe('Projects · Stint');
    page.unmount();
  });
});
