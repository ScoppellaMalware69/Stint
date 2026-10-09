import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import type { DatabaseState } from '@/domain/models';
import { DEFAULT_STORAGE_KEY } from '@/services/storage/local-store';
import {
  queryKeys,
  useClients,
  useCreateClient,
  useCrossTabSync,
  useEntries,
  useLookups,
  useRunningEntry,
  useStartTimer,
} from './index';

/* These tests use the real app API on jsdom's localStorage, which starts with demo data. */

function createWrapper() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { queryClient, wrapper: Wrapper };
}

describe('query keys', () => {
  it('nest every key under the root so one invalidation refreshes everything', () => {
    const keys = [
      queryKeys.settings(),
      queryKeys.clients(),
      queryKeys.client('c1'),
      queryKeys.projects(),
      queryKeys.project('p1'),
      queryKeys.entries(),
      queryKeys.entries({ billable: true }),
      queryKeys.running(),
      queryKeys.invoices(),
      queryKeys.invoice('i1'),
      queryKeys.invoiceNumberPreview('2026-10-09'),
    ];
    for (const key of keys) expect(key[0]).toBe(queryKeys.root[0]);
    expect(queryKeys.invoice('i1').slice(0, 2)).toEqual(queryKeys.invoices());
  });
});

describe('useLookups', () => {
  it('combines settings, clients and projects with lookup maps', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => useLookups(), { wrapper });

    expect(result.current.isPending).toBe(true);
    await waitFor(() => expect(result.current.data).toBeDefined());

    const lookups = result.current.data;
    if (lookups === undefined) throw new Error('Expected lookups');
    expect(result.current).toMatchObject({ isPending: false, error: null });
    expect(lookups.clients).toHaveLength(4);
    expect(lookups.projectsById.size).toBe(lookups.projects.length);
    expect(lookups.clientsById.get(lookups.clients[0]?.id ?? '')).toEqual(lookups.clients[0]);
    expect(lookups.billing.settings).toBe(lookups.settings);
  });
});

describe('mutations', () => {
  it('refresh cached queries after a successful write', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => ({ clients: useClients(), create: useCreateClient() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.clients.data).toHaveLength(4));

    await act(() =>
      result.current.create.mutateAsync({
        name: 'Aardvark Labs',
        email: null,
        address: null,
        hourlyRateCents: null,
      }),
    );

    await waitFor(() =>
      expect(result.current.clients.data?.map((client) => client.name)).toContain('Aardvark Labs'),
    );
  });

  it('show a started timer as running', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(() => ({ running: useRunningEntry(), start: useStartTimer() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.running.isSuccess).toBe(true));
    expect(result.current.running.data).toBeNull();

    await act(() =>
      result.current.start.mutateAsync({ description: 'Focus', projectId: null, billable: false }),
    );

    await waitFor(() =>
      expect(result.current.running.data).toMatchObject({ description: 'Focus', end: null }),
    );
  });
});

describe('useEntries', () => {
  it('lists entries for a query and can be disabled', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => ({
        billable: useEntries({ billable: true }, { keepPrevious: true }),
        disabled: useEntries(undefined, { enabled: false }),
      }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.billable.isSuccess).toBe(true));
    expect(result.current.billable.data?.length).toBeGreaterThan(0);
    expect(result.current.billable.data?.every((entry) => entry.billable)).toBe(true);
    expect(result.current.disabled.fetchStatus).toBe('idle');
  });
});

describe('useCrossTabSync', () => {
  it('refreshes data when another tab changes it', async () => {
    const { wrapper } = createWrapper();
    const { result } = renderHook(
      () => {
        useCrossTabSync();
        return useClients();
      },
      { wrapper },
    );
    await waitFor(() => expect(result.current.data).toHaveLength(4));

    // Simulate another tab archiving every client.
    const raw = window.localStorage.getItem(DEFAULT_STORAGE_KEY) ?? '';
    const db = JSON.parse(raw) as DatabaseState;
    for (const client of db.clients) client.archived = true;
    window.localStorage.setItem(DEFAULT_STORAGE_KEY, JSON.stringify(db));
    window.dispatchEvent(new StorageEvent('storage', { key: DEFAULT_STORAGE_KEY }));

    await waitFor(() => expect(result.current.data?.every((client) => client.archived)).toBe(true));
  });
});
