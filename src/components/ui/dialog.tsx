import { X } from 'lucide-react';
import { Dialog as RadixDialog } from 'radix-ui';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { IconButton } from './icon-button';
import { OVERLAY_CLASSES, PANEL_CLASSES } from './styles';

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

const FOOTER_CLASSES =
  'flex flex-col-reverse gap-2 border-t border-line bg-surface px-5 py-4 sm:flex-row sm:items-center sm:justify-end';

const SIZES = {
  sm: 'max-w-sm',
  md: 'max-w-lg',
  lg: 'max-w-2xl',
} as const;

type DialogContentProps = Omit<
  ComponentProps<typeof RadixDialog.Content>,
  'title' | 'children'
> & {
  title: ReactNode;
  description?: ReactNode;
  children?: ReactNode;
  /** Actions pinned below the scrollable body. Use DialogFooter instead when the
   * buttons must live inside a <form> rendered as children. */
  footer?: ReactNode;
  size?: keyof typeof SIZES;
  hideClose?: boolean;
};

export function DialogContent({
  title,
  description,
  children,
  footer,
  size = 'md',
  hideClose = false,
  className,
  ...props
}: DialogContentProps) {
  const hasDescription = description !== undefined && description !== null;
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className={OVERLAY_CLASSES} />
      <RadixDialog.Content
        // Without a description, opt out explicitly so Radix does not warn.
        {...(hasDescription ? null : { 'aria-describedby': undefined })}
        className={cn(PANEL_CLASSES, SIZES[size], className)}
        {...props}
      >
        <div className={cn('shrink-0 px-5 pt-5 pb-4', !hideClose && 'pe-14')}>
          <RadixDialog.Title className="text-lg font-semibold text-ink">{title}</RadixDialog.Title>
          {hasDescription ? (
            <RadixDialog.Description className="mt-1 text-sm text-ink-2">
              {description}
            </RadixDialog.Description>
          ) : null}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">{children}</div>
        {footer ? <div className={cn(FOOTER_CLASSES, 'shrink-0 rounded-b-xl')}>{footer}</div> : null}
        {/* Last in DOM order so initial focus lands on the first field, not on "Close". */}
        {hideClose ? null : (
          <RadixDialog.Close asChild>
            <IconButton
              label="Close"
              icon={X}
              size="icon-sm"
              showTooltip={false}
              className="absolute end-3 top-3"
            />
          </RadixDialog.Close>
        )}
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}

/**
 * Footer for buttons rendered inside the dialog body (e.g. at the end of a <form>).
 * It sticks to the bottom of the scrolling body so the actions stay reachable.
 */
export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(FOOTER_CLASSES, 'sticky bottom-0 -mx-5 mt-6 -mb-5', className)}
      {...props}
    />
  );
}
