import { columnTotal, seriesValue } from './chart-data';
import type { ChartSeries, ColumnDatum } from './types';

export interface ChartTableProps {
  /** Names the table for assistive technology (visually hidden). */
  caption: string;
  categoryHeader: string;
  data: readonly ColumnDatum[];
  series: readonly ChartSeries[];
  formatValue: (value: number) => string;
}

const HEADER_CELL = 'px-3 py-2 font-medium whitespace-nowrap';

/** The accessible twin of a column chart: one row per category, one column per series. */
export function ChartTable({
  caption,
  categoryHeader,
  data,
  series,
  formatValue,
}: ChartTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="bg-sunken text-xs text-ink-2">
            <th scope="col" className={`${HEADER_CELL} rounded-l-md text-left`}>
              {categoryHeader}
            </th>
            {series.map((item) => (
              <th key={item.id} scope="col" className={`${HEADER_CELL} text-right`}>
                {item.label}
              </th>
            ))}
            <th scope="col" className={`${HEADER_CELL} rounded-r-md text-right`}>
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((datum) => (
            <tr key={datum.id} className="border-b border-line last:border-b-0">
              <th
                scope="row"
                className="px-3 py-2 text-left font-normal whitespace-nowrap text-ink"
              >
                {datum.fullLabel}
              </th>
              {series.map((item) => (
                <td key={item.id} className="px-3 py-2 text-right text-ink-2 tabular-nums">
                  {formatValue(seriesValue(datum, item.id))}
                </td>
              ))}
              <td className="px-3 py-2 text-right font-medium text-ink tabular-nums">
                {formatValue(columnTotal(datum, series))}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
