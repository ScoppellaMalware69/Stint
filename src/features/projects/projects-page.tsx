import { Page } from '@/components/layout/page';
import { PageHeader } from '@/components/layout/page-header';
import { useDocumentTitle } from '@/hooks/use-document-title';

// Temporary placeholder; the feature implementation replaces this module.
export function ProjectsPage() {
  useDocumentTitle('Projects');
  return (
    <Page>
      <PageHeader title="Projects" description="Rates, budgets and progress for each project." />
      <p className="text-ink-2">This page is being built.</p>
    </Page>
  );
}
