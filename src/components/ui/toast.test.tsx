import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { toast, Toaster } from './toast';

function notifications() {
  return screen.getByRole('region', { name: /notifications/i });
}

describe('toast', () => {
  it('renders a status message with title and description', async () => {
    render(<Toaster />);
    act(() => {
      toast({ title: 'Client saved', description: 'Northwind Studio', tone: 'success' });
    });

    const item = await within(notifications()).findByRole('listitem');
    expect(item).toHaveTextContent('Client saved');
    expect(item).toHaveTextContent('Northwind Studio');
    expect(within(item).getByRole('button', { name: 'Dismiss notification' })).toBeInTheDocument();

    // Screen readers hear it through a polite live region.
    const announcement = await screen.findByRole('status');
    expect(announcement).toHaveAttribute('aria-live', 'polite');
    await waitFor(() => expect(announcement).toHaveTextContent('Client saved Northwind Studio'));
  });

  it('runs the action and closes the toast when the action is clicked', async () => {
    const user = userEvent.setup();
    const onUndo = vi.fn();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Entry deleted', action: { label: 'Undo', onClick: onUndo } });
    });

    const item = await within(notifications()).findByRole('listitem');
    await user.click(within(item).getByRole('button', { name: 'Undo' }));

    expect(onUndo).toHaveBeenCalledOnce();
    await waitFor(() =>
      expect(within(notifications()).queryByRole('listitem')).not.toBeInTheDocument(),
    );
  });

  it('closes from the dismiss button', async () => {
    const user = userEvent.setup();
    render(<Toaster />);
    act(() => {
      toast({ title: 'Could not save', tone: 'danger' });
    });

    const item = await within(notifications()).findByRole('listitem');
    await user.click(within(item).getByRole('button', { name: 'Dismiss notification' }));

    await waitFor(() =>
      expect(within(notifications()).queryByRole('listitem')).not.toBeInTheDocument(),
    );
  });
});
