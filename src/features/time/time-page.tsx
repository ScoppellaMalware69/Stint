import { Page } from '@/components/layout/page';
import { PageHeader } from '@/components/layout/page-header';
import { useDocumentTitle } from '@/hooks/use-document-title';

// Temporary placeholder; the feature implementation replaces this module.
export function TimePage() {
  useDocumentTitle('Time');
  return (
    <Page>
      <PageHeader title="Time" description="Track time with the timer or add entries by hand." />
      <p className="text-ink-2">This page is being built.</p>
    </Page>
  );
}
