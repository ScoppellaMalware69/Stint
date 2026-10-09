import { Page } from '@/components/layout/page';
import { PageHeader } from '@/components/layout/page-header';
import { useDocumentTitle } from '@/hooks/use-document-title';

// Temporary placeholder; the feature implementation replaces this module.
export function InvoicesPage() {
  useDocumentTitle('Invoices');
  return (
    <Page>
      <PageHeader title="Invoices" description="Drafts, sent and paid invoices." />
      <p className="text-ink-2">This page is being built.</p>
    </Page>
  );
}
