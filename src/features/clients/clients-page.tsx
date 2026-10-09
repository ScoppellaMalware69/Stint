import { Page } from '@/components/layout/page';
import { PageHeader } from '@/components/layout/page-header';
import { useDocumentTitle } from '@/hooks/use-document-title';

// Temporary placeholder; the feature implementation replaces this module.
export function ClientsPage() {
  useDocumentTitle('Clients');
  return (
    <Page>
      <PageHeader title="Clients" description="The people and companies you work for." />
      <p className="text-ink-2">This page is being built.</p>
    </Page>
  );
}
