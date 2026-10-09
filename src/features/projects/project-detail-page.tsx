import { Page } from '@/components/layout/page';
import { PageHeader } from '@/components/layout/page-header';
import { useDocumentTitle } from '@/hooks/use-document-title';

// Temporary placeholder; the feature implementation replaces this module.
export function ProjectDetailPage() {
  useDocumentTitle('Project');
  return (
    <Page>
      <PageHeader
        title="Project"
        description="Time, budget and billing for this project."
        breadcrumbs={[{ label: 'Projects', to: '/projects' }]}
      />
      <p className="text-ink-2">This page is being built.</p>
    </Page>
  );
}
