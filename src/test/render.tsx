import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { ThemeProvider } from '@/app/theme';
import { ConfirmProvider } from '@/components/ui/confirm';
import { Toaster } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';

interface RenderWithProvidersOptions {
  /** Initial URL, e.g. `/time?week=2026-10-05`. Defaults to `/`. */
  route?: string;
  /** Route pattern the UI is mounted at, e.g. `/projects/:projectId`. Defaults to `*`. */
  path?: string;
}

/**
 * Renders `ui` the way the app does: a fresh query cache (no retries), a memory data
 * router (so router hooks, links and `useSearchParams` work), tooltips, confirmations
 * and toasts. Returns Testing Library's result plus the router and query client.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path = '*' }: RenderWithProvidersOptions = {},
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Infinity },
      mutations: { retry: false },
    },
  });
  const router = createMemoryRouter([{ path, element: ui }], { initialEntries: [route] });

  const result = render(
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <TooltipProvider>
          <ConfirmProvider>
            <RouterProvider router={router} />
            <Toaster />
          </ConfirmProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>,
  );

  return { ...result, router, queryClient };
}
