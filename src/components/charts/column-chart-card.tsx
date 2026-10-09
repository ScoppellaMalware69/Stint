import { useState, type ReactNode } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { isAllZero, seriesTotal } from './chart-data';
import { ChartLegend } from './chart-legend';
import { ChartTable } from './chart-table';
import { ChartViewToggle, type ChartView } from './chart-view-toggle';
import { ColumnChart } from './column-chart';
import type { ValueUnit } from './scale';
import type { ChartSeries, ColumnDatum } from './types';

/** Value-label band + x-axis band that `ColumnChart` adds to the plot height. */
const CHART_CHROME_HEIGHT = 48;
const DEFAULT_PLOT_HEIGHT = 200;

export interface ColumnChartCardProps {
  title: string;
  description?: ReactNode;
  /** Header of the category column in the table view, e.g. "Day". */
  categoryHeader: string;
  data: readonly ColumnDatum[];
  series: readonly ChartSeries[];
  formatValue: (value: number) => string;
  formatAxisValue?: (value: number) => string;
  /** Plot height in px (default 200). */
  height?: number;
  highlightId?: string;
  /** Pass `"seconds"` for durations to get hour-based ticks. */
  valueUnit?: ValueUnit;
  /** Keeps the previous render visible, dimmed, while new data loads. */
  isRefreshing?: boolean;
  /** Extra header controls, placed before the Chart/Table toggle. */
  actions?: ReactNode;
  emptyMessage?: string;
}

/**
 * A titled card around a column chart with its legend and an accessible table view.
 */
export function ColumnChartCard({
  title,
  description,
  categoryHeader,
  data,
  series,
  formatValue,
  formatAxisValue,
  height = DEFAULT_PLOT_HEIGHT,
  highlightId,
  valueUnit,
  isRefreshing = false,
  actions,
  emptyMessage = 'Nothing to show for this period.',
}: ColumnChartCardProps) {
  const [view, setView] = useState<ChartView>('chart');
  const isEmpty = isAllZero(data, series);
  const showLegend = !isEmpty && view === 'chart' && series.length >= 2;

  const header = (
    <>
      {actions}
      {isEmpty ? null : (
        <ChartViewToggle label={`Show ${title} as`} value={view} onChange={setView} />
      )}
    </>
  );

  return (
    <Card as="section">
      <CardHeader title={title} description={description} action={header} />
      <CardBody className="space-y-4">
        {showLegend && (
          <ChartLegend
            series={series}
            totals={Object.fromEntries(
              series.map((item) => [item.id, formatValue(seriesTotal(data, item.id))]),
            )}
          />
        )}
        <div
          aria-busy={isRefreshing || undefined}
          className={cn('transition-opacity duration-200', isRefreshing && 'opacity-60')}
        >
          {isEmpty ? (
            <p
              className="flex items-center justify-center rounded-md bg-sunken px-4 text-center text-sm text-ink-3"
              style={{ minHeight: height + CHART_CHROME_HEIGHT }}
            >
              {emptyMessage}
            </p>
          ) : view === 'chart' ? (
            <ColumnChart
              data={data}
              series={series}
              formatValue={formatValue}
              formatAxisValue={formatAxisValue}
              height={height}
              ariaLabel={title}
              highlightId={highlightId}
              valueUnit={valueUnit}
            />
          ) : (
            <ChartTable
              caption={title}
              categoryHeader={categoryHeader}
              data={data}
              series={series}
              formatValue={formatValue}
            />
          )}
        </div>
      </CardBody>
    </Card>
  );
}
