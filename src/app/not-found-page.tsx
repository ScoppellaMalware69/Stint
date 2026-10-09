import { House } from 'lucide-react';
import { Link } from 'react-router';
import { Page } from '@/components/layout/page';
import { Button } from '@/components/ui/button';
import { useDocumentTitle } from '@/hooks/use-document-title';

export function NotFoundPage() {
  useDocumentTitle('Page not found');

  return (
    <Page>
      <div className="max-w-lg py-6 lg:py-10">
        <p className="text-sm font-medium text-ink-3">Error 404</p>
        <h1 className="mt-2 font-display text-display text-ink">Page not found</h1>
        <p className="mt-3 text-ink-2">
          The page you&apos;re looking for doesn&apos;t exist. It may have been moved, or the link
          may be incomplete.
        </p>
        <Button asChild className="mt-6">
          <Link to="/">
            <House aria-hidden />
            Go to overview
          </Link>
        </Button>
      </div>
    </Page>
  );
}
