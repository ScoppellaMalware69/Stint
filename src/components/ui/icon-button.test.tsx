import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Pencil } from 'lucide-react';
import { describe, expect, it, vi } from 'vitest';
import { IconButton } from './icon-button';
import { TooltipProvider } from './tooltip';

describe('IconButton', () => {
  it('uses the label as its accessible name and shows it as a tooltip on focus', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();
    render(
      <TooltipProvider>
        <IconButton label="Edit project" icon={Pencil} onClick={onClick} />
      </TooltipProvider>,
    );

    const button = screen.getByRole('button', { name: 'Edit project' });
    expect(button).toHaveAttribute('type', 'button');

    await user.tab();
    expect(button).toHaveFocus();
    expect(await screen.findByRole('tooltip')).toHaveTextContent('Edit project');

    await user.keyboard('{Enter}');
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('can render without a tooltip', () => {
    render(<IconButton label="Close" icon={Pencil} showTooltip={false} />);
    expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
  });
});
