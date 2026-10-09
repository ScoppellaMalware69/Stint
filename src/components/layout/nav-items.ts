import {
  ChartColumn,
  FolderKanban,
  LayoutDashboard,
  ReceiptText,
  Settings,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  /** Only active on an exact match (the overview would otherwise match every path). */
  end?: boolean;
}

export const PRIMARY_NAV_ITEMS: readonly NavItem[] = [
  { to: '/', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/time', label: 'Time', icon: Timer },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/clients', label: 'Clients', icon: Users },
  { to: '/invoices', label: 'Invoices', icon: ReceiptText },
  { to: '/reports', label: 'Reports', icon: ChartColumn },
];

export const SETTINGS_NAV_ITEM: NavItem = { to: '/settings', label: 'Settings', icon: Settings };
