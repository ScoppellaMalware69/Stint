import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Standard page container: centred, max 72rem wide, responsive gutters. */
export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10', className)}>
      {children}
    </div>
  );
}
