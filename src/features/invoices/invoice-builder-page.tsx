import { Page } from '@/components/layout/page';
import { PageHeader } from '@/components/layout/page-header';
import { useDocumentTitle } from '@/hooks/use-document-title';

// Temporary placeholder; the feature implementation replaces this module.
export function InvoiceBuilderPage() {
  useDocumentTitle('New invoice');
  return (
    <Page>
      <PageHeader
        title="New invoice"
        description="Turn unbilled time into an invoice."
        breadcrumbs={[{ label: 'Invoices', to: '/invoices' }]}
      />
      <p className="text-ink-2">This page is being built.</p>
    </Page>
  );
}
