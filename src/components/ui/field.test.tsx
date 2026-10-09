import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Field } from './field';
import { Input } from './input';

describe('Field', () => {
  it('labels the control and describes it with the hint', () => {
    render(
      <Field label="Email" hint="Invoices are sent here">
        {(control) => <Input type="email" {...control} />}
      </Field>,
    );
    const input = screen.getByLabelText('Email');
    expect(input).toHaveAccessibleDescription('Invoices are sent here');
    expect(input).not.toHaveAttribute('aria-invalid');
  });

  it('marks the control invalid and links the error before the hint', () => {
    render(
      <Field label="Email" hint="Invoices are sent here" error="Enter a valid email address">
        {(control) => <Input type="email" {...control} />}
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Email' });
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toHaveAccessibleDescription('Enter a valid email address Invoices are sent here');
    expect(screen.getByText('Enter a valid email address')).toBeVisible();
  });

  it('flags required fields without changing the accessible name', () => {
    render(
      <Field label="Name" required>
        {(control) => <Input {...control} />}
      </Field>,
    );
    const input = screen.getByRole('textbox', { name: 'Name' });
    expect(input).toHaveAttribute('aria-required', 'true');
    expect(input).not.toHaveAttribute('aria-describedby');
  });

  it('keeps a visually hidden label available to assistive technology', () => {
    render(
      <Field label="Search" labelHidden>
        {(control) => <Input type="search" {...control} />}
      </Field>,
    );
    expect(screen.getByRole('searchbox', { name: 'Search' })).toBeInTheDocument();
    expect(screen.getByText('Search')).toHaveClass('sr-only');
  });
});
