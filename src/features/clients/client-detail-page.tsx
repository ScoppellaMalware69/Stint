import { Page } from '@/components/layout/page';
import { PageHeader } from '@/components/layout/page-header';
import { useDocumentTitle } from '@/hooks/use-document-title';

// Temporary placeholder; the feature implementation replaces this module.
export function ClientDetailPage() {
  useDocumentTitle('Client');
  return (
    <Page>
      <PageHeader
        title="Client"
        description="Projects, time and invoices for this client."
        breadcrumbs={[{ label: 'Clients', to: '/clients' }]}
      />
      <p className="text-ink-2">This page is being built.</p>
    </Page>
  );
}
