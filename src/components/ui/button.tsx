import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { Spinner } from './spinner';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon' | 'icon-sm';

export type ButtonProps = ComponentProps<'button'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Render the single child (e.g. a router `<Link>`) with button styles instead of a `<button>`. */
  asChild?: boolean;
  /** Shows a spinner, sets `aria-busy` and disables the button. */
  loading?: boolean;
};

// `aria-disabled` is styled like `disabled` so a control can stay focusable while inert
// (e.g. pagination at its bounds) without losing keyboard focus.
const BASE =
  'inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-md font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4';

// Hover styles only apply to enabled controls, so disabled buttons do not look interactive.
const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-ink text-ink-inverse not-disabled:not-aria-disabled:hover:bg-ink/85',
  secondary:
    'border border-line-strong bg-surface text-ink not-disabled:not-aria-disabled:hover:bg-sunken',
  ghost: 'bg-transparent text-ink not-disabled:not-aria-disabled:hover:bg-sunken',
  danger:
    'border border-danger bg-surface text-danger not-disabled:not-aria-disabled:hover:bg-danger-soft',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-sm lg:h-8',
  md: 'h-10 px-4 text-sm lg:h-9',
  lg: 'h-12 px-5 text-base lg:h-11',
  icon: 'size-10 lg:size-9',
  'icon-sm': 'size-9 lg:size-8',
};

// eslint-disable-next-line react-refresh/only-export-components -- the spec places buttonVariants beside Button (used for links styled as buttons)
export function buttonVariants({
  variant = 'primary',
  size = 'md',
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}): string {
  return cn(BASE, VARIANTS[variant], SIZES[size], className);
}

export function Button({
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  type,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = buttonVariants({ variant, size, className });

  if (asChild) {
    return (
      <Slot.Root className={classes} aria-busy={loading || undefined} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      type={type ?? 'button'}
      className={classes}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner /> : null}
      {children}
    </button>
  );
}
