import { NavLink } from 'react-router';
import { cn } from '@/lib/cn';
import { PRIMARY_NAV_ITEMS, SETTINGS_NAV_ITEM, type NavItem } from './nav-items';

interface PrimaryNavProps {
  /** Called when a link is clicked, e.g. to close the mobile drawer right away. */
  onNavigate?: () => void;
}

function NavItemLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      end={item.end}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          'flex h-10 items-center gap-3 rounded-md px-3 transition-colors duration-150 lg:h-9',
          isActive
            ? 'bg-sunken font-medium text-ink'
            : 'text-ink-2 hover:bg-sunken/60 hover:text-ink',
        )
      }
    >
      <Icon aria-hidden className="size-[18px] shrink-0" />
      {item.label}
    </NavLink>
  );
}

/** Main navigation (sidebar and mobile drawer). NavLink sets `aria-current="page"`. */
export function PrimaryNav({ onNavigate }: PrimaryNavProps) {
  return (
    <nav aria-label="Main">
      <ul className="flex flex-col gap-0.5">
        {PRIMARY_NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavItemLink item={item} onNavigate={onNavigate} />
          </li>
        ))}
      </ul>
      <hr className="my-3 border-line" />
      <ul>
        <li>
          <NavItemLink item={SETTINGS_NAV_ITEM} onNavigate={onNavigate} />
        </li>
      </ul>
    </nav>
  );
}
