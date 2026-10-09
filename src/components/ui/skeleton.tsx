import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

/** Loading placeholder. Decorative: give the loading region an accessible label instead. */
export function Skeleton({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div aria-hidden className={cn('animate-pulse rounded-md bg-sunken', className)} {...props} />
  );
}
