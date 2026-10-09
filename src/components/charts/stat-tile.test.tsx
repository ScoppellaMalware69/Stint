import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HeroFigure } from './hero-figure';
import { StatTile } from './stat-tile';

describe('StatTile', () => {
  it('shows the label, value, delta and footnote', () => {
    render(
      <StatTile
        label="Billable this month"
        value="€4,250"
        delta={{ label: '+12% vs last month', direction: 'up', sentiment: 'positive' }}
        footnote="32h not yet invoiced"
        action={<button type="button">Details</button>}
      />,
    );
    expect(screen.getByText('Billable this month')).toBeInTheDocument();
    expect(screen.getByText('€4,250')).toHaveClass('font-semibold', 'proportional-nums');
    expect(screen.getByText('+12% vs last month')).toHaveClass('text-success');
    expect(screen.getByText('32h not yet invoiced')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Details' })).toBeInTheDocument();
  });

  it('colours a bad change with the danger token', () => {
    render(
      <StatTile
        label="Tracked this week"
        value="18h"
        delta={{ label: '−6h vs last week', direction: 'down', sentiment: 'negative' }}
      />,
    );
    expect(screen.getByText('−6h vs last week')).toHaveClass('text-danger');
  });
});

describe('HeroFigure', () => {
  it('renders the headline value in the sans hero size', () => {
    render(<HeroFigure label="Unbilled" value="€3,120" caption="Across 3 clients" />);
    expect(screen.getByText('€3,120')).toHaveClass('text-hero', 'font-semibold');
    expect(screen.getByText('Across 3 clients')).toBeInTheDocument();
  });
});
