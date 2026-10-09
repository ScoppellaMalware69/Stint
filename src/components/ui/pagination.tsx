import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from './button';

interface PaginationProps {
  /** Current page, 1-based. */
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
  /** Accessible name of the navigation landmark. */
  label?: string;
}

/** Previous/next pager. Renders nothing when everything fits on one page. */
export function Pagination({ page, pageCount, onPageChange, label = 'Pagination' }: PaginationProps) {
  if (pageCount <= 1) return null;
  const current = Math.min(Math.max(page, 1), pageCount);
  const isFirst = current <= 1;
  const isLast = current >= pageCount;

  // aria-disabled (not `disabled`) keeps keyboard focus on the button when a bound is reached.
  return (
    <nav aria-label={label} className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-ink-2 tabular-nums" aria-live="polite" aria-atomic="true">
        Page {current} of {pageCount}
      </p>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          aria-disabled={isFirst || undefined}
          onClick={() => {
            if (!isFirst) onPageChange(current - 1);
          }}
        >
          <ChevronLeft aria-hidden />
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          aria-disabled={isLast || undefined}
          onClick={() => {
            if (!isLast) onPageChange(current + 1);
          }}
        >
          Next
          <ChevronRight aria-hidden />
        </Button>
      </div>
    </nav>
  );
}
