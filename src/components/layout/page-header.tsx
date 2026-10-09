import { ChevronRight } from 'lucide-react';
import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router';

interface Breadcrumb {
  label: string;
  to: string;
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  /** Page-level actions (buttons, menus), shown to the right on wider screens. */
  actions?: ReactNode;
  /** Ancestor pages, outermost first. The current page is the title. */
  breadcrumbs?: Breadcrumb[];
  /** Secondary facts under the title (status badge, client, dates). */
  meta?: ReactNode;
}

export function PageHeader({ title, description, actions, breadcrumbs, meta }: PageHeaderProps) {
  return (
    <header className="mb-6 lg:mb-8">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-3">
          <ol className="flex flex-wrap items-center gap-1 text-sm text-ink-2">
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={crumb.to}>
                {index > 0 ? (
                  <li aria-hidden="true" className="flex">
                    <ChevronRight className="size-3.5 text-ink-3" />
                  </li>
                ) : null}
                <li className="min-w-0">
                  <Link
                    to={crumb.to}
                    className="rounded-sm underline-offset-4 transition-colors duration-150 hover:text-ink hover:underline"
                  >
                    {crumb.label}
                  </Link>
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-display text-display wrap-break-word text-ink">{title}</h1>
          {description ? <p className="mt-2 max-w-prose text-ink-2">{description}</p> : null}
          {meta ? (
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-ink-2">
              {meta}
            </div>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2 sm:shrink-0 sm:justify-end">
            {actions}
          </div>
        ) : null}
      </div>
    </header>
  );
}
