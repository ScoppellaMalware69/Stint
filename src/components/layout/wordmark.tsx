import { cn } from '@/lib/cn';

/** The Stint logo: the favicon mark (a dial with a running wedge) and the serif name. */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-center gap-2', className)}>
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" className="size-6 shrink-0">
        <rect width="32" height="32" rx="7" className="fill-ink" />
        <circle
          cx="16"
          cy="16"
          r="9.25"
          fill="none"
          strokeWidth="2.5"
          className="stroke-ink-inverse"
        />
        <path d="M16 16 L16 9.5 A6.5 6.5 0 0 1 21.63 19.25 Z" className="fill-signal" />
      </svg>
      <span className="font-display text-[1.625rem] leading-none text-ink">Stint</span>
    </span>
  );
}
