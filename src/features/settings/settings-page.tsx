import { Page } from '@/components/layout/page';
import { PageHeader } from '@/components/layout/page-header';
import { useDocumentTitle } from '@/hooks/use-document-title';

// Temporary placeholder; the feature implementation replaces this module.
export function SettingsPage() {
  useDocumentTitle('Settings');
  return (
    <Page>
      <PageHeader
        title="Settings"
        description="Your business details, billing defaults and data."
      />
      <p className="text-ink-2">This page is being built.</p>
    </Page>
  );
}
