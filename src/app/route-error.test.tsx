import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createMemoryRouter } from 'react-router';
import { RouterProvider } from 'react-router/dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createQueryClient } from '@/app/query-client';
import { ConfirmProvider } from '@/components/ui/confirm';
import { StorageCorruptedError } from '@/services/api';
import { RouteErrorPage } from './route-error';

function Thrower({ error }: { error: unknown }): never {
  throw error;
}

function renderRouteError(error: unknown) {
  const router = createMemoryRouter([
    { path: '*', element: <Thrower error={error} />, errorElement: <RouteErrorPage /> },
  ]);
  render(
    <QueryClientProvider client={createQueryClient()}>
      <ConfirmProvider>
        <RouterProvider router={router} />
      </ConfirmProvider>
    </QueryClientProvider>,
  );
}

describe('RouteErrorPage', () => {
  beforeEach(() => {
    // React and React Router log caught render errors; the page itself is under test.
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('explains the problem and offers recovery without a stack trace', () => {
    renderRouteError(new Error('Cannot read properties of undefined'));

    expect(screen.getByRole('heading', { level: 1, name: 'Something went wrong' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Reload' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Go to overview' })).toHaveAttribute('href', '/');
    expect(screen.getByText('Error: Cannot read properties of undefined')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset local data' })).not.toBeInTheDocument();
    expect(screen.queryByText(/at \w+ \(/)).not.toBeInTheDocument();
  });

  it('asks for confirmation before resetting corrupted local data', async () => {
    const user = userEvent.setup();
    renderRouteError(new StorageCorruptedError());

    expect(
      screen.getByRole('heading', { level: 1, name: "Your saved data couldn't be read" }),
    ).toBeVisible();
    await user.click(screen.getByRole('button', { name: 'Reset local data' }));

    const dialog = await screen.findByRole('alertdialog', { name: 'Reset local data?' });
    expect(dialog).toHaveTextContent('cannot be undone');
    await user.click(screen.getByRole('button', { name: 'Cancel' }));

    await waitFor(() => expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument());
    expect(screen.getByRole('button', { name: 'Reset local data' })).toBeEnabled();
  });
});
