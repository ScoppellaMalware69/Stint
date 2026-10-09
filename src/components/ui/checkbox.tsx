import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

type CheckboxProps = Omit<ComponentProps<'input'>, 'type'> & {
  label?: ReactNode;
  description?: ReactNode;
};

/**
 * Native checkbox tinted with the ink token. It is always wrapped in a <label> of at
 * least 24×24px so the hit area meets WCAG 2.5.8 even without visible label text
 * (pass `aria-label` in that case).
 */
export function Checkbox({
  label,
  description,
  className,
  id,
  'aria-describedby': ariaDescribedBy,
  ...props
}: CheckboxProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const descriptionId = description ? `${inputId}-description` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col', className)}>
      <label
        className={cn(
          'inline-flex min-h-6 min-w-6 cursor-pointer items-center gap-2.5 self-start text-ink has-disabled:cursor-not-allowed has-disabled:opacity-50',
          !label && 'justify-center',
        )}
      >
        <input
          type="checkbox"
          id={inputId}
          aria-describedby={describedBy}
          className="size-4 shrink-0 cursor-[inherit] accent-ink"
          {...props}
        />
        {label ? <span className="text-sm">{label}</span> : null}
      </label>
      {description ? (
        <p id={descriptionId} className="ps-[1.625rem] text-xs text-ink-3">
          {description}
        </p>
      ) : null}
    </div>
  );
}
