import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { ConfirmProvider, useConfirm } from './confirm';

function DeleteButton({ onResult }: { onResult: (confirmed: boolean) => void }) {
  const confirm = useConfirm();
  return (
    <button
      type="button"
      onClick={async () => {
        onResult(
          await confirm({
            title: 'Delete project?',
            description: 'This cannot be undone.',
            confirmLabel: 'Delete project',
            tone: 'danger',
          }),
        );
      }}
    >
      Delete
    </button>
  );
}

function renderHarness() {
  const onResult = vi.fn();
  render(
    <ConfirmProvider>
      <DeleteButton onResult={onResult} />
    </ConfirmProvider>,
  );
  return { onResult, user: userEvent.setup() };
}

describe('useConfirm', () => {
  it('resolves true when the user confirms', async () => {
    const { onResult, user } = renderHarness();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Delete project?' });
    expect(dialog).toHaveAccessibleDescription('This cannot be undone.');
    await user.click(within(dialog).getByRole('button', { name: 'Delete project' }));

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(true));
    expect(onResult).toHaveBeenCalledOnce();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Delete' })).toHaveFocus();
  });

  it('resolves false when the user cancels', async () => {
    const { onResult, user } = renderHarness();
    await user.click(screen.getByRole('button', { name: 'Delete' }));

    const dialog = await screen.findByRole('alertdialog');
    // Destructive confirmations start on the safe choice.
    const cancel = within(dialog).getByRole('button', { name: 'Cancel' });
    expect(cancel).toHaveFocus();
    await user.click(cancel);

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
  });

  it('resolves false when dismissed with Escape', async () => {
    const { onResult, user } = renderHarness();
    await user.click(screen.getByRole('button', { name: 'Delete' }));
    await screen.findByRole('alertdialog');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(onResult).toHaveBeenCalledWith(false));
    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
  });
});
