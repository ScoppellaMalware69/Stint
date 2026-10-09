import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Pagination } from './pagination';

describe('Pagination', () => {
  it('disables Previous on the first page and moves forward with Next', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={1} pageCount={3} onPageChange={onPageChange} label="Invoice pages" />);

    const nav = screen.getByRole('navigation', { name: 'Invoice pages' });
    expect(within(nav).getByText('Page 1 of 3')).toBeInTheDocument();

    const previous = within(nav).getByRole('button', { name: 'Previous' });
    expect(previous).toHaveAttribute('aria-disabled', 'true');
    await user.click(previous);
    expect(onPageChange).not.toHaveBeenCalled();

    await user.click(within(nav).getByRole('button', { name: 'Next' }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it('disables Next on the last page and keeps focus on it', async () => {
    const user = userEvent.setup();
    const onPageChange = vi.fn();
    render(<Pagination page={3} pageCount={3} onPageChange={onPageChange} />);

    const next = screen.getByRole('button', { name: 'Next' });
    expect(next).toHaveAttribute('aria-disabled', 'true');
    expect(screen.getByRole('button', { name: 'Previous' })).not.toHaveAttribute('aria-disabled');

    next.focus();
    await user.keyboard('{Enter}');
    expect(onPageChange).not.toHaveBeenCalled();
    expect(next).toHaveFocus();
  });

  it('renders nothing when there is a single page', () => {
    render(<Pagination page={1} pageCount={1} onPageChange={vi.fn()} />);
    expect(screen.queryByRole('navigation')).not.toBeInTheDocument();
  });
});
