import { Page } from '@/components/layout/page';
import { PageHeader } from '@/components/layout/page-header';
import { useDocumentTitle } from '@/hooks/use-document-title';

// Temporary placeholder; the feature implementation replaces this module.
export function ReportsPage() {
  useDocumentTitle('Reports');
  return (
    <Page>
      <PageHeader title="Reports" description="Where your time goes, by project and client." />
      <p className="text-ink-2">This page is being built.</p>
    </Page>
  );
}
