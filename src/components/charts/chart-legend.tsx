import type { ChartSeries } from './types';

export interface ChartLegendProps {
  series: readonly ChartSeries[];
  /** Optional formatted total per series id, shown after the label. */
  totals?: Readonly<Record<string, string>>;
}

/** Series key: a swatch matching the column marks, the name in ink, then the total. */
export function ChartLegend({ series, totals }: ChartLegendProps) {
  return (
    <ul aria-label="Legend" className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-sm">
      {series.map((item) => {
        const total = totals?.[item.id];
        return (
          <li key={item.id} className="flex min-w-0 items-center gap-2">
            <svg width="10" height="10" className="shrink-0" aria-hidden="true">
              <rect width="10" height="10" rx="2" fill={item.color} />
            </svg>
            <span className="min-w-0 truncate text-ink-2">{item.label}</span>
            {total === undefined ? null : (
              <span className="font-medium text-ink tabular-nums">{total}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
