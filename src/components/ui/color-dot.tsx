import { cn } from '@/lib/cn';
import { dataColorVar, type DataColor } from '@/lib/colors';

interface ColorDotProps {
  color: DataColor;
  size?: 'sm' | 'md';
  className?: string;
}

/** Project identity swatch. Decorative: always render the project name next to it. */
export function ColorDot({ color, size = 'md', className }: ColorDotProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-block shrink-0 rounded-full',
        size === 'sm' ? 'size-2' : 'size-2.5',
        className,
      )}
      style={{ backgroundColor: dataColorVar(color) }}
    />
  );
}
