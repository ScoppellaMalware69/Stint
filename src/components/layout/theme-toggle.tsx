import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useId } from 'react';
import { useTheme, type ThemePreference } from '@/app/theme';
import { Tooltip } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';

const OPTIONS: readonly { value: ThemePreference; label: string; icon: LucideIcon }[] = [
  { value: 'system', label: 'System', icon: Monitor },
  { value: 'light', label: 'Light', icon: Sun },
  { value: 'dark', label: 'Dark', icon: Moon },
];

/**
 * Theme picker: a labelled group of native radio buttons (arrow keys move between
 * them). Icons are paired with screen-reader text and a tooltip for pointer users.
 */
export function ThemeToggle({ className }: { className?: string }) {
  const { preference, setPreference } = useTheme();
  const labelId = useId();
  const name = useId();

  return (
    <div className={cn('flex items-center justify-between gap-3', className)}>
      <span id={labelId} className="text-sm text-ink-2">
        Theme
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="flex gap-0.5 rounded-md bg-sunken p-0.5"
      >
        {OPTIONS.map((option) => {
          const Icon = option.icon;
          const checked = preference === option.value;
          return (
            <Tooltip key={option.value} content={option.label}>
              <label
                className={cn(
                  'grid size-10 cursor-pointer place-items-center rounded-sm transition-colors duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink lg:size-8',
                  checked ? 'bg-surface text-ink' : 'text-ink-2 hover:text-ink',
                )}
              >
                <input
                  type="radio"
                  name={name}
                  value={option.value}
                  checked={checked}
                  onChange={() => setPreference(option.value)}
                  className="sr-only"
                />
                <Icon aria-hidden className="size-4" />
                <span className="sr-only">{option.label}</span>
              </label>
            </Tooltip>
          );
        })}
      </div>
    </div>
  );
}
