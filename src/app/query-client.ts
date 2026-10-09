import { QueryClient } from '@tanstack/react-query';
import { StorageCorruptedError } from '@/services/api';

/**
 * Data lives in this browser, so failures are deterministic (validation, corrupt
 * storage) and retrying would only delay the error message.
 *
 * Corrupt storage breaks every screen at once and no retry can fix it, so it is
 * thrown to the route error boundary, which offers the reset flow. Other errors stay
 * in query state for each view's own error UI.
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 30_000,
        throwOnError: (error) => error instanceof StorageCorruptedError,
      },
      mutations: { retry: false },
    },
  });
}
