import { RotateCw, TriangleAlert } from 'lucide-react';
import type { ReactNode } from 'react';
import { isRouteErrorResponse, Link, useRouteError } from 'react-router';
import { NotFoundPage } from '@/app/not-found-page';
import { Page } from '@/components/layout/page';
import { useIsInsideShell } from '@/components/layout/shell-context';
import { Wordmark } from '@/components/layout/wordmark';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/components/ui/confirm';
import { toast } from '@/components/ui/toast';
import { useDocumentTitle } from '@/hooks/use-document-title';
import { errorMessage, StorageCorruptedError } from '@/services/api';
import { useClearAllData } from '@/services/queries';

/** Lazy page chunks fail to download after a deploy or when the connection drops. */
const CHUNK_LOAD_ERROR =
  /dynamically imported module|Importing a module script failed|error loading dynamically imported module/i;

function isChunkLoadError(error: unknown): boolean {
  return error instanceof Error && CHUNK_LOAD_ERROR.test(error.message);
}

/** One line for bug reports: the error's name and message, never a stack trace. */
function technicalSummary(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`.trim();
  if (error instanceof Error) return `${error.name}: ${error.message}`;
  return errorMessage(error);
}

function ResetLocalData() {
  const confirm = useConfirm();
  const clearAllData = useClearAllData();

  const reset = async () => {
    const confirmed = await confirm({
      title: 'Reset local data?',
      description:
        'This permanently deletes every client, project, time entry and invoice saved in this browser and restores the default settings. It cannot be undone.',
      confirmLabel: 'Reset local data',
      tone: 'danger',
    });
    if (!confirmed) return;
    try {
      await clearAllData.mutateAsync();
      // A full reload starts every cache and subscription from the fresh, empty data.
      window.location.assign('/');
    } catch (error) {
      toast({
        title: "Couldn't reset local data",
        description: errorMessage(error),
        tone: 'danger',
      });
    }
  };

  return (
    <section
      aria-labelledby="reset-local-data"
      className="mt-8 rounded-lg border border-line bg-surface p-4"
    >
      <h2 id="reset-local-data" className="text-base font-semibold text-ink">
        Start over
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        If reloading doesn&apos;t help, reset the data saved in this browser. If you have a backup
        file, you can import it afterwards from Settings.
      </p>
      <Button
        variant="danger"
        className="mt-4"
        loading={clearAllData.isPending}
        onClick={() => void reset()}
      >
        Reset local data
      </Button>
    </section>
  );
}

function ErrorContent({ error }: { error: unknown }) {
  const insideShell = useIsInsideShell();
  const corrupted = error instanceof StorageCorruptedError;
  const chunkFailed = isChunkLoadError(error);
  useDocumentTitle('Something went wrong');

  let title = 'Something went wrong';
  let description =
    'Stint ran into an unexpected problem while showing this page. Your data is stored in this browser and has not been changed.';
  if (corrupted) {
    title = "Your saved data couldn't be read";
    description =
      'The data stored in this browser is damaged, so Stint cannot open it. Reloading can help if another tab was saving at the same time.';
  } else if (chunkFailed) {
    title = "This page couldn't be loaded";
    description =
      'Part of the app failed to download, perhaps because the connection dropped or Stint was updated. Reloading usually fixes this.';
  }

  const content: ReactNode = (
    <div className="max-w-lg py-6 lg:py-10">
      <TriangleAlert aria-hidden className="size-6 text-status-warning" />
      <h1 className="mt-4 font-display text-display text-ink">{title}</h1>
      <p className="mt-3 text-ink-2">{description}</p>
      <div className="mt-6 flex flex-wrap gap-2">
        <Button onClick={() => window.location.reload()}>
          <RotateCw aria-hidden />
          Reload
        </Button>
        <Button asChild variant="secondary">
          <Link to="/">Go to overview</Link>
        </Button>
      </div>
      {corrupted ? <ResetLocalData /> : null}
      <details className="mt-8 text-sm text-ink-2">
        <summary className="cursor-pointer rounded-sm">Technical details</summary>
        <p className="mt-2 font-mono text-xs wrap-anywhere text-ink-3">{technicalSummary(error)}</p>
      </details>
    </div>
  );

  if (insideShell) return <Page>{content}</Page>;

  // The shell itself failed: render standalone with the wordmark for orientation.
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col px-4 py-6 sm:px-6 lg:px-8">
      <Wordmark className="self-start" />
      <main className="flex flex-1 items-center">{content}</main>
    </div>
  );
}

/** Error boundary for routes: friendly copy, recovery actions, no stack traces. */
export function RouteErrorPage() {
  const error = useRouteError();
  if (isRouteErrorResponse(error) && error.status === 404) return <NotFoundPage />;
  return <ErrorContent error={error} />;
}
