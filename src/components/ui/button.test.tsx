import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('defaults to type="button" so it never submits a form by accident', () => {
    render(<Button>Save</Button>);
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute('type', 'button');
  });

  it('renders its child element with the button classes when asChild is set', () => {
    render(
      <Button asChild variant="secondary" size="sm">
        <a href="/projects">Projects</a>
      </Button>,
    );
    const link = screen.getByRole('link', { name: 'Projects' });
    expect(link).toHaveAttribute('href', '/projects');
    expect(link).toHaveClass('rounded-md', 'border-line-strong', 'bg-surface', 'h-9');
    expect(link).not.toHaveAttribute('type');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('marks a loading button as busy and disables it', async () => {
    const onClick = vi.fn();
    render(
      <Button loading onClick={onClick}>
        Save
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Save' });
    expect(button).toHaveAttribute('aria-busy', 'true');
    expect(button).toBeDisabled();

    await userEvent.setup().click(button);
    expect(onClick).not.toHaveBeenCalled();
  });
});
