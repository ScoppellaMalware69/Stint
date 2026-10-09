import { ChevronDown } from 'lucide-react';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { CONTROL_CLASSES, CONTROL_HEIGHT } from './styles';

type SelectProps = ComponentProps<'select'> & {
  invalid?: boolean;
  /** Classes for the wrapper, which sizes the control (the select fills it). */
  className?: string;
};

/** Native select (best mobile UX and accessibility) with the design-system look. */
export function Select({
  invalid,
  className,
  children,
  'aria-invalid': ariaInvalid,
  ...props
}: SelectProps) {
  return (
    <div className={cn('relative grid w-full min-w-0', className)}>
      <select
        aria-invalid={invalid || ariaInvalid || undefined}
        className={cn(
          CONTROL_CLASSES,
          CONTROL_HEIGHT,
          'col-start-1 row-start-1 cursor-pointer appearance-none truncate ps-3 pe-9',
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        aria-hidden
        className="pointer-events-none col-start-1 row-start-1 me-3 size-4 self-center justify-self-end text-ink-2"
      />
    </div>
  );
}
