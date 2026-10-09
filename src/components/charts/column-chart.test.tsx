import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatDurationText } from '@/lib/duration';
import { ColumnChart } from './column-chart';
import type { ChartSeries, ColumnDatum } from './types';

const HOUR = 3600;
const series: ChartSeries[] = [
  { id: 'website', label: 'Website', color: 'var(--data-blue)' },
  { id: 'admin', label: 'Admin', color: 'var(--data-other)' },
];
const data: ColumnDatum[] = [
  {
    id: '2026-10-06',
    label: 'Mon',
    fullLabel: 'Mon 6 Oct',
    values: { website: 4 * HOUR, admin: 3.5 * HOUR },
  },
  { id: '2026-10-07', label: 'Tue', fullLabel: 'Tue 7 Oct', values: { website: 2 * HOUR } },
  { id: '2026-10-08', label: 'Wed', fullLabel: 'Wed 8 Oct', values: {} },
];

function renderChart(chartSeries: ChartSeries[] = series) {
  render(
    <ColumnChart
      data={data}
      series={chartSeries}
      formatValue={formatDurationText}
      ariaLabel="Hours per day"
      valueUnit="seconds"
      highlightId="2026-10-07"
    />,
  );
  return within(screen.getByRole('group', { name: 'Hours per day' })).getAllByRole('img');
}

describe('ColumnChart', () => {
  it('renders one focusable column per datum with descriptive labels', () => {
    const columns = renderChart();
    expect(columns).toHaveLength(3);
    expect(columns[0]).toHaveAccessibleName('Mon 6 Oct: 7h 30m total; Website: 4h; Admin: 3h 30m');
    expect(columns[1]).toHaveAccessibleName('Tue 7 Oct: 2h total; Website: 2h');
    expect(columns[2]).toHaveAccessibleName('Wed 8 Oct: 0m total');
    expect(columns.map((column) => column.getAttribute('tabindex'))).toEqual(['0', '-1', '-1']);
  });

  it('uses the plain total for a single series', () => {
    const columns = renderChart(series.slice(0, 1));
    expect(columns[0]).toHaveAccessibleName('Mon 6 Oct: 4h');
  });

  it('moves focus with the arrow keys and shows the tooltip for the focused column', async () => {
    const user = userEvent.setup();
    const columns = renderChart();

    await user.tab();
    expect(columns[0]).toHaveFocus();
    expect(screen.getByText('Mon 6 Oct')).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(columns[1]).toHaveFocus();
    expect(columns[1]).toHaveAttribute('tabindex', '0');
    expect(columns[0]).toHaveAttribute('tabindex', '-1');
    expect(screen.queryByText('Mon 6 Oct')).not.toBeInTheDocument();
    expect(screen.getByText('Tue 7 Oct')).toBeInTheDocument();
    expect(screen.getByText('Website')).toBeInTheDocument();

    await user.keyboard('{End}');
    expect(columns[2]).toHaveFocus();
    await user.keyboard('{Home}');
    expect(columns[0]).toHaveFocus();
    await user.keyboard('{ArrowLeft}');
    expect(columns[0]).toHaveFocus();

    await user.keyboard('{Escape}');
    expect(screen.queryByText('Mon 6 Oct')).not.toBeInTheDocument();
    expect(columns[0]).toHaveFocus();
  });

  it('shows the same tooltip on hover, with values before series names', async () => {
    const user = userEvent.setup();
    const columns = renderChart();

    await user.hover(columns[0] as Element);
    const title = screen.getByText('Mon 6 Oct');
    const tooltip = title.parentElement as HTMLElement;
    // The tooltip is aria-hidden (the focused column's label carries the same text).
    expect(tooltip).toHaveAttribute('aria-hidden', 'true');
    const rows = within(tooltip).getAllByRole('listitem', { hidden: true });
    expect(rows.map((row) => row.textContent)).toEqual(['4hWebsite', '3h 30mAdmin']);
    expect(within(tooltip).getByText('7h 30m')).toHaveClass('font-semibold');

    await user.unhover(columns[0] as Element);
    expect(screen.queryByText('Mon 6 Oct')).not.toBeInTheDocument();
  });
});
