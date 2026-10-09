import { ChartColumn, Table2, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ChartView = 'chart' | 'table';

const OPTIONS: readonly { value: ChartView; label: string; icon: LucideIcon }[] = [
  { value: 'chart', label: 'Chart', icon: ChartColumn },
  { value: 'table', label: 'Table', icon: Table2 },
];

interface ChartViewToggleProps {
  /** Accessible name of the button group, e.g. "Show Hours per day as". */
  label: string;
  value: ChartView;
  onChange: (view: ChartView) => void;
}

/** Two pressed-state buttons styled like the UI kit's segmented control. */
export function ChartViewToggle({ label, value, onChange }: ChartViewToggleProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex gap-0.5 rounded-full bg-sunken p-0.5"
    >
      {OPTIONS.map(({ value: option, label: optionLabel, icon: Icon }) => {
        const pressed = option === value;
        return (
          <button
            key={option}
            type="button"
            aria-pressed={pressed}
            onClick={() => onChange(option)}
            className={cn(
              'flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium whitespace-nowrap transition-colors duration-150 select-none focus-visible:-outline-offset-2 lg:h-7',
              pressed
                ? 'bg-surface text-ink shadow-card ring-1 ring-line'
                : 'text-ink-2 hover:text-ink',
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {optionLabel}
          </button>
        );
      })}
    </div>
  );
}
