import { createBrowserRouter } from 'react-router';
import { NotFoundPage } from '@/app/not-found-page';
import { RouteErrorPage } from '@/app/route-error';
import { AppShell } from '@/components/layout/app-shell';

/** Every page is code-split; each module exports its page component by name. */
export const router = createBrowserRouter([
  {
    Component: AppShell,
    // While the first page chunk downloads, show the shell (with an empty main area)
    // rather than a blank screen. React keeps the same AppShell instance afterwards.
    HydrateFallback: AppShell,
    // Last resort when the shell itself fails.
    ErrorBoundary: RouteErrorPage,
    children: [
      {
        // Page errors render inside the shell, so navigation keeps working.
        ErrorBoundary: RouteErrorPage,
        children: [
          {
            index: true,
            lazy: async () => ({
              Component: (await import('@/features/overview/overview-page')).OverviewPage,
            }),
          },
          {
            path: 'time',
            lazy: async () => ({ Component: (await import('@/features/time/time-page')).TimePage }),
          },
          {
            path: 'projects',
            lazy: async () => ({
              Component: (await import('@/features/projects/projects-page')).ProjectsPage,
            }),
          },
          {
            path: 'projects/:projectId',
            lazy: async () => ({
              Component: (await import('@/features/projects/project-detail-page'))
                .ProjectDetailPage,
            }),
          },
          {
            path: 'clients',
            lazy: async () => ({
              Component: (await import('@/features/clients/clients-page')).ClientsPage,
            }),
          },
          {
            path: 'clients/:clientId',
            lazy: async () => ({
              Component: (await import('@/features/clients/client-detail-page')).ClientDetailPage,
            }),
          },
          {
            path: 'invoices',
            lazy: async () => ({
              Component: (await import('@/features/invoices/invoices-page')).InvoicesPage,
            }),
          },
          {
            path: 'invoices/new',
            lazy: async () => ({
              Component: (await import('@/features/invoices/invoice-builder-page'))
                .InvoiceBuilderPage,
            }),
          },
          {
            path: 'invoices/:invoiceId',
            lazy: async () => ({
              Component: (await import('@/features/invoices/invoice-detail-page'))
                .InvoiceDetailPage,
            }),
          },
          {
            path: 'reports',
            lazy: async () => ({
              Component: (await import('@/features/reports/reports-page')).ReportsPage,
            }),
          },
          {
            path: 'settings',
            lazy: async () => ({
              Component: (await import('@/features/settings/settings-page')).SettingsPage,
            }),
          },
          // Not lazy: the error page already bundles it with the shell.
          { path: '*', Component: NotFoundPage },
        ],
      },
    ],
  },
]);
