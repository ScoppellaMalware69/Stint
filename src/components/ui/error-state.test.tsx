import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ErrorState } from './error-state';

describe('ErrorState', () => {
  it('shows the error message and retries', async () => {
    const onRetry = vi.fn();
    render(<ErrorState error={new Error('Storage is full')} onRetry={onRetry} />);

    expect(screen.getByRole('alert')).toHaveTextContent('Storage is full');
    await userEvent.setup().click(screen.getByRole('button', { name: 'Retry' }));
    expect(onRetry).toHaveBeenCalledOnce();
  });

  it('falls back to a generic message for unknown errors', () => {
    render(<ErrorState title="Couldn’t load projects" error={{ reason: 'unknown' }} />);
    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Couldn’t load projects');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
