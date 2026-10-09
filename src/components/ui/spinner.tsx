import { LoaderCircle } from 'lucide-react';
import { cn } from '@/lib/cn';

interface SpinnerProps {
  /** Announced to assistive technology. Without a label the spinner is decorative. */
  label?: string;
  className?: string;
}

export function Spinner({ label, className }: SpinnerProps) {
  const icon = <LoaderCircle aria-hidden className={cn('size-4 shrink-0 animate-spin', className)} />;
  if (!label) return icon;
  return (
    <span role="status" className="inline-flex items-center">
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  );
}
