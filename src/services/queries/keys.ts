import type { EntryQuery } from '@/services/api';

const ROOT = 'stint';

/**
 * Query keys for every cached API resource. All keys share the `root` prefix, so
 * invalidating `queryKeys.root` refreshes everything after a write.
 */
export const queryKeys = {
  root: [ROOT] as const,
  settings: () => [ROOT, 'settings'] as const,
  clients: () => [ROOT, 'clients'] as const,
  client: (id: string) => [ROOT, 'clients', id] as const,
  projects: () => [ROOT, 'projects'] as const,
  project: (id: string) => [ROOT, 'projects', id] as const,
  entries: (query?: EntryQuery) =>
    query === undefined ? ([ROOT, 'entries'] as const) : ([ROOT, 'entries', query] as const),
  running: () => [ROOT, 'running'] as const,
  invoices: () => [ROOT, 'invoices'] as const,
  invoice: (id: string) => [ROOT, 'invoices', id] as const,
  invoiceNumberPreview: (issueDate: string) => [ROOT, 'invoice-number', issueDate] as const,
};
