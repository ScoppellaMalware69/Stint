import { Page } from '@/components/layout/page';
import { PageHeader } from '@/components/layout/page-header';
import { useDocumentTitle } from '@/hooks/use-document-title';

// Temporary placeholder; the feature implementation replaces this module.
export function InvoiceDetailPage() {
  useDocumentTitle('Invoice');
  return (
    <Page>
      <PageHeader
        title="Invoice"
        description="Review, send and track payment."
        breadcrumbs={[{ label: 'Invoices', to: '/invoices' }]}
      />
      <p className="text-ink-2">This page is being built.</p>
    </Page>
  );
}
