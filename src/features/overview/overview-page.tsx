import { Page } from '@/components/layout/page';
import { PageHeader } from '@/components/layout/page-header';
import { useDocumentTitle } from '@/hooks/use-document-title';

// Temporary placeholder; the feature implementation replaces this module.
export function OverviewPage() {
  useDocumentTitle('Overview');
  return (
    <Page>
      <PageHeader
        title="Overview"
        description="Your week at a glance: hours, billable work and invoices."
      />
      <p className="text-ink-2">This page is being built.</p>
    </Page>
  );
}
