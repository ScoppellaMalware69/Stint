import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Meter } from './meter';

describe('Meter', () => {
  it('exposes the meter semantics', () => {
    render(<Meter value={12} max={40} label="Budget used" valueText="12h of 40h (30%)" />);
    const meter = screen.getByRole('meter', { name: 'Budget used' });
    expect(meter).toHaveAttribute('aria-valuemin', '0');
    expect(meter).toHaveAttribute('aria-valuemax', '40');
    expect(meter).toHaveAttribute('aria-valuenow', '12');
    expect(meter).toHaveAttribute('aria-valuetext', '12h of 40h (30%)');
    expect(meter.firstElementChild).toHaveStyle({ width: '30%' });
    expect(screen.queryByText(/budget$/)).not.toBeInTheDocument();
  });

  it('labels the warning level with an icon and text', () => {
    render(
      <Meter value={34} max={40} label="Budget used" valueText="34h of 40h" level="warning" />,
    );
    expect(screen.getByText('Near budget')).toBeInTheDocument();
    expect(screen.getByRole('meter')).toHaveClass('bg-meter-track-warning');
  });

  it('fills the whole track when over and keeps aria-valuenow within range', () => {
    render(<Meter value={46} max={40} label="Budget used" valueText="46h of 40h" level="over" />);
    const meter = screen.getByRole('meter', { name: 'Budget used' });
    expect(meter).toHaveAttribute('aria-valuenow', '40');
    expect(meter.firstElementChild).toHaveStyle({ width: '100%' });
    expect(meter.firstElementChild).toHaveClass('bg-status-critical');
    expect(screen.getByText('Over budget')).toBeInTheDocument();
  });

  it('can leave the status label to the caller', () => {
    render(
      <Meter
        value={46}
        max={40}
        label="Budget used"
        valueText="46h of 40h"
        level="over"
        showStatus={false}
      />,
    );
    expect(screen.queryByText('Over budget')).not.toBeInTheDocument();
  });
});
