import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';
import { CONTROL_CLASSES } from './styles';

type TextareaProps = ComponentProps<'textarea'> & { invalid?: boolean };

export function Textarea({
  invalid,
  className,
  rows = 3,
  'aria-invalid': ariaInvalid,
  ...props
}: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(CONTROL_CLASSES, 'min-h-20 resize-y px-3 py-2', className)}
      {...props}
    />
  );
}
