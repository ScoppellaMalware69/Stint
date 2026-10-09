import { useId } from 'react';
import { cn } from '@/lib/cn';

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

interface SegmentedControlProps<T extends string> {
  /** Names the group for assistive technology (visually hidden). */
  legend: string;
  value: T;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Single choice between a few options, built on native radio inputs so arrow keys,
 * form semantics and screen-reader announcements work without custom handling.
 */
export function SegmentedControl<T extends string>({
  legend,
  value,
  onChange,
  options,
  size = 'md',
  className,
}: SegmentedControlProps<T>) {
  const name = useId();
  return (
    <fieldset className={cn('m-0 max-w-full min-w-0 border-0 p-0', className)}>
      <legend className="sr-only">{legend}</legend>
      <div className="inline-flex max-w-full gap-0.5 overflow-x-auto rounded-full bg-sunken p-0.5 [scrollbar-width:none]">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              // The radio itself is visually hidden, so the label carries the focus outline
              // (drawn inside, so the scrolling track cannot clip it).
              'flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap text-ink-2 transition-colors duration-150 select-none hover:text-ink has-checked:bg-surface has-checked:text-ink has-checked:shadow-card has-checked:ring-1 has-checked:ring-line has-focus-visible:outline-2 has-focus-visible:-outline-offset-2 has-focus-visible:outline-ink',
              size === 'sm' ? 'h-8 lg:h-7' : 'h-9 lg:h-8',
            )}
          >
            <input
              type="radio"
              className="sr-only"
              name={name}
              value={option.value}
              checked={option.value === value}
              onChange={() => onChange(option.value)}
            />
            {option.label}
            {/* The space keeps the accessible name "Draft 3" rather than "Draft3". */}
            {option.count === undefined ? null : ' '}
            {option.count === undefined ? null : (
              <span className="text-xs text-ink-3 tabular-nums">{option.count}</span>
            )}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
