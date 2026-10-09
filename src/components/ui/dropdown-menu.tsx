import type { LucideIcon } from 'lucide-react';
import { DropdownMenu as RadixDropdownMenu } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

export const DropdownMenu = RadixDropdownMenu.Root;
export const DropdownMenuTrigger = RadixDropdownMenu.Trigger;

export function DropdownMenuContent({
  align = 'end',
  sideOffset = 6,
  collisionPadding = 8,
  className,
  ...props
}: ComponentProps<typeof RadixDropdownMenu.Content>) {
  return (
    <RadixDropdownMenu.Portal>
      <RadixDropdownMenu.Content
        align={align}
        sideOffset={sideOffset}
        collisionPadding={collisionPadding}
        className={cn(
          'z-50 max-h-(--radix-dropdown-menu-content-available-height) min-w-44 overflow-y-auto rounded-lg border border-line bg-surface p-1 text-ink shadow-pop data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in',
          className,
        )}
        {...props}
      />
    </RadixDropdownMenu.Portal>
  );
}

type DropdownMenuItemProps = ComponentProps<typeof RadixDropdownMenu.Item> & {
  icon?: LucideIcon;
  tone?: 'default' | 'danger';
};

export function DropdownMenuItem({
  icon: Icon,
  tone = 'default',
  className,
  children,
  ...props
}: DropdownMenuItemProps) {
  return (
    <RadixDropdownMenu.Item
      className={cn(
        // Items take real focus while navigating; keep the outline but draw it inside.
        'flex min-h-10 cursor-default items-center gap-2.5 rounded-md px-2.5 text-sm -outline-offset-2 select-none data-disabled:cursor-not-allowed data-disabled:opacity-50 lg:min-h-8',
        tone === 'danger'
          ? 'text-danger data-highlighted:bg-danger-soft'
          : 'text-ink data-highlighted:bg-sunken',
        className,
      )}
      {...props}
    >
      {Icon ? (
        <Icon
          aria-hidden
          className={cn('size-4 shrink-0', tone === 'danger' ? 'text-danger' : 'text-ink-2')}
        />
      ) : null}
      {children}
    </RadixDropdownMenu.Item>
  );
}

export function DropdownMenuSeparator({
  className,
  ...props
}: ComponentProps<typeof RadixDropdownMenu.Separator>) {
  return (
    <RadixDropdownMenu.Separator className={cn('-mx-1 my-1 h-px bg-line', className)} {...props} />
  );
}

export function DropdownMenuLabel({
  className,
  ...props
}: ComponentProps<typeof RadixDropdownMenu.Label>) {
  return (
    <RadixDropdownMenu.Label
      className={cn('px-2.5 pt-1.5 pb-1 text-xs text-ink-3', className)}
      {...props}
    />
  );
}
