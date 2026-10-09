import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithProviders } from '@/test/render';
import { AppShell } from './app-shell';

const NAV_LABELS = ['Overview', 'Time', 'Projects', 'Clients', 'Invoices', 'Reports', 'Settings'];

describe('AppShell', () => {
  beforeEach(() => {
    // jsdom does not implement scrolling; <ScrollRestoration> scrolls on navigation.
    vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined);
  });

  it('renders the primary navigation and marks the current section', () => {
    renderWithProviders(<AppShell />, { route: '/projects/p1' });

    const nav = screen.getByRole('navigation', { name: 'Main' });
    const links = within(nav).getAllByRole('link');
    expect(links.map((link) => link.textContent)).toEqual(NAV_LABELS);
    expect(within(nav).getByRole('link', { name: 'Projects' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    expect(within(nav).getByRole('link', { name: 'Overview' })).not.toHaveAttribute('aria-current');
  });

  it('offers a skip link to the main landmark', () => {
    renderWithProviders(<AppShell />);

    expect(screen.getByRole('link', { name: 'Skip to content' })).toHaveAttribute('href', '#main');
    expect(screen.getByRole('main')).toHaveAttribute('id', 'main');
  });

  it('opens the mobile drawer and closes it after navigating', async () => {
    const user = userEvent.setup();
    const { router } = renderWithProviders(<AppShell />);

    await user.click(screen.getByRole('button', { name: 'Open navigation' }));
    const drawer = await screen.findByRole('dialog', { name: 'Navigation' });
    const drawerNav = within(drawer).getByRole('navigation', { name: 'Main' });
    expect(
      within(drawerNav)
        .getAllByRole('link')
        .map((link) => link.textContent),
    ).toEqual(NAV_LABELS);
    expect(within(drawer).getByRole('radiogroup', { name: 'Theme' })).toBeInTheDocument();

    await user.click(within(drawerNav).getByRole('link', { name: 'Invoices' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(router.state.location.pathname).toBe('/invoices');
  });

  it('closes the drawer with its close button and returns focus to the menu button', async () => {
    const user = userEvent.setup();
    renderWithProviders(<AppShell />);
    const menuButton = screen.getByRole('button', { name: 'Open navigation' });

    await user.click(menuButton);
    await user.click(await screen.findByRole('button', { name: 'Close navigation' }));

    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    expect(menuButton).toHaveFocus();
  });

  it('shows the idle timer with a start button once the timer has loaded', async () => {
    renderWithProviders(<AppShell />);

    expect(await screen.findByRole('button', { name: 'Start timer' })).toBeInTheDocument();
    expect(screen.getByText('No timer running')).toBeInTheDocument();
  });
});
