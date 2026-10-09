import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Button } from './button';
import { Dialog, DialogClose, DialogContent, DialogTrigger } from './dialog';
import { Field } from './field';
import { Input } from './input';

function renderDialog() {
  render(
    <Dialog>
      <DialogTrigger asChild>
        <Button>New client</Button>
      </DialogTrigger>
      <DialogContent
        title="New client"
        description="Add someone you work for."
        footer={
          <DialogClose asChild>
            <Button variant="secondary">Cancel</Button>
          </DialogClose>
        }
      >
        <Field label="Name">{(control) => <Input {...control} />}</Field>
      </DialogContent>
    </Dialog>,
  );
  return userEvent.setup();
}

describe('Dialog', () => {
  it('opens labelled by its title and focuses the first field', async () => {
    const user = renderDialog();
    await user.click(screen.getByRole('button', { name: 'New client' }));

    const dialog = await screen.findByRole('dialog', { name: 'New client' });
    expect(dialog).toHaveAccessibleDescription('Add someone you work for.');
    expect(screen.getByRole('textbox', { name: 'Name' })).toHaveFocus();
  });

  it('closes with Escape and returns focus to the trigger', async () => {
    const user = renderDialog();
    const trigger = screen.getByRole('button', { name: 'New client' });
    await user.click(trigger);
    await screen.findByRole('dialog');

    await user.keyboard('{Escape}');

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it('closes from the close button', async () => {
    const user = renderDialog();
    await user.click(screen.getByRole('button', { name: 'New client' }));
    await screen.findByRole('dialog');

    await user.click(screen.getByRole('button', { name: 'Close' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
  });
});
