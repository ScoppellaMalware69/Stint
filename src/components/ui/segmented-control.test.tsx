import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './segmented-control';

type Status = 'all' | 'draft' | 'paid';

const OPTIONS = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft', count: 3 },
  { value: 'paid', label: 'Paid' },
] as const;

function Harness({ onChange }: { onChange: (value: Status) => void }) {
  const [value, setValue] = useState<Status>('all');
  return (
    <SegmentedControl
      legend="Invoice status"
      value={value}
      options={OPTIONS}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

describe('SegmentedControl', () => {
  it('exposes a named group of radios with the current value checked', () => {
    render(<Harness onChange={vi.fn()} />);
    expect(screen.getByRole('group', { name: 'Invoice status' })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: 'All' })).toBeChecked();
    expect(screen.getByRole('radio', { name: 'Draft 3' })).not.toBeChecked();
  });

  it('calls onChange when a segment is clicked', async () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await userEvent.setup().click(screen.getByText('Paid'));

    expect(onChange).toHaveBeenCalledWith('paid');
    expect(screen.getByRole('radio', { name: 'Paid' })).toBeChecked();
  });

  it('moves the selection with the arrow keys', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);

    await user.tab();
    expect(screen.getByRole('radio', { name: 'All' })).toHaveFocus();

    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('draft');
    expect(screen.getByRole('radio', { name: 'Draft 3' })).toBeChecked();

    await user.keyboard('{ArrowRight}');
    expect(onChange).toHaveBeenLastCalledWith('paid');
    expect(screen.getByRole('radio', { name: 'Paid' })).toHaveFocus();
  });
});
