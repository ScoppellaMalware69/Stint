import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { formatDurationText } from '@/lib/duration';
import { ColumnChartCard, type ColumnChartCardProps } from './column-chart-card';
import type { ChartSeries, ColumnDatum } from './types';

const HOUR = 3600;
const series: ChartSeries[] = [
  { id: 'website', label: 'Website', color: 'var(--data-blue)' },
  { id: 'admin', label: 'Admin', color: 'var(--data-other)' },
];
const data: ColumnDatum[] = [
  {
    id: 'mon',
    label: 'Mon',
    fullLabel: 'Mon 6 Oct',
    values: { website: 4 * HOUR, admin: 3.5 * HOUR },
  },
  { id: 'tue', label: 'Tue', fullLabel: 'Tue 7 Oct', values: { website: 2 * HOUR } },
];

function renderCard(props: Partial<ColumnChartCardProps> = {}) {
  return render(
    <ColumnChartCard
      title="Hours per day"
      description="This week"
      categoryHeader="Day"
      data={data}
      series={series}
      formatValue={formatDurationText}
      valueUnit="seconds"
      {...props}
    />,
  );
}

describe('ColumnChartCard', () => {
  it('shows the chart under an h2 and switches to a table with correct totals', async () => {
    const user = userEvent.setup();
    renderCard();

    expect(screen.getByRole('heading', { level: 2, name: 'Hours per day' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Hours per day' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Chart' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Table' }));

    expect(screen.getByRole('button', { name: 'Table' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByRole('button', { name: 'Chart' })).toHaveAttribute('aria-pressed', 'false');
    expect(screen.queryByRole('group', { name: 'Hours per day' })).not.toBeInTheDocument();

    const table = screen.getByRole('table', { name: 'Hours per day' });
    const headers = within(table).getAllByRole('columnheader');
    expect(headers.map((header) => header.textContent)).toEqual([
      'Day',
      'Website',
      'Admin',
      'Total',
    ]);
    const [, monday, tuesday] = within(table).getAllByRole('row');
    expect(within(monday as HTMLElement).getByRole('rowheader')).toHaveTextContent('Mon 6 Oct');
    expect(
      within(monday as HTMLElement)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['4h', '3h 30m', '7h 30m']);
    expect(
      within(tuesday as HTMLElement)
        .getAllByRole('cell')
        .map((cell) => cell.textContent),
    ).toEqual(['2h', '0m', '2h']);
  });

  it('shows a legend with series totals only for two or more series', () => {
    const { unmount } = renderCard();
    const legend = screen.getByRole('list', { name: 'Legend' });
    expect(
      within(legend)
        .getAllByRole('listitem')
        .map((item) => item.textContent),
    ).toEqual(['Website6h', 'Admin3h 30m']);
    unmount();

    renderCard({ series: series.slice(0, 1) });
    expect(screen.queryByRole('list', { name: 'Legend' })).not.toBeInTheDocument();
  });

  it('shows the empty message instead of the chart when every value is zero', () => {
    renderCard({
      data: data.map((datum) => ({ ...datum, values: { website: 0 } })),
      emptyMessage: 'No time tracked this week.',
    });
    expect(screen.getByText('No time tracked this week.')).toBeInTheDocument();
    expect(screen.queryByRole('group', { name: 'Hours per day' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Table' })).not.toBeInTheDocument();
  });

  it('keeps the previous render while refreshing', () => {
    renderCard({ isRefreshing: true });
    const chart = screen.getByRole('group', { name: 'Hours per day' });
    expect(chart.closest('[aria-busy="true"]')).toHaveClass('opacity-60');
  });
});
