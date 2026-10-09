import { CircleAlert } from 'lucide-react';
import { useId, type ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Props a Field hands to its control; spread them onto the input/select/textarea. */
interface FieldControlProps {
  id: string;
  'aria-describedby'?: string;
  'aria-invalid'?: true;
  'aria-required'?: true;
}

interface FieldProps {
  label: ReactNode;
  hint?: ReactNode;
  /** Validation message; when present the control is marked invalid. */
  error?: ReactNode;
  required?: boolean;
  className?: string;
  /** Keeps the label for assistive technology but hides it visually. */
  labelHidden?: boolean;
  children: (control: FieldControlProps) => ReactNode;
}

function hasContent(node: ReactNode): boolean {
  return node !== undefined && node !== null && node !== false && node !== '';
}

export function Field({
  label,
  hint,
  error,
  required,
  className,
  labelHidden,
  children,
}: FieldProps) {
  const id = useId();
  const hintId = hasContent(hint) ? `${id}-hint` : undefined;
  const errorId = hasContent(error) ? `${id}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex min-w-0 flex-col gap-1.5', className)}>
      <label
        htmlFor={id}
        className={cn(
          'text-sm font-medium text-ink',
          // The asterisk has empty alt text: required-ness reaches assistive tech via aria-required.
          required && "after:ms-0.5 after:text-ink-3 after:content-['*'_/_'']",
          labelHidden && 'sr-only',
        )}
      >
        {label}
      </label>
      {children({
        id,
        'aria-describedby': describedBy,
        'aria-invalid': errorId ? true : undefined,
        'aria-required': required ? true : undefined,
      })}
      {hintId ? (
        <p id={hintId} className="text-xs text-ink-3">
          {hint}
        </p>
      ) : null}
      {errorId ? (
        <p id={errorId} className="flex items-start gap-1.5 text-sm text-danger">
          <CircleAlert aria-hidden className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      ) : null}
    </div>
  );
}

interface FieldGroupProps {
  legend: ReactNode;
  description?: ReactNode;
  legendHidden?: boolean;
  className?: string;
  children: ReactNode;
}

/** Groups related controls (e.g. a radio set or address lines) under one legend. */
export function FieldGroup({
  legend,
  description,
  legendHidden,
  className,
  children,
}: FieldGroupProps) {
  const descriptionId = useId();
  const hasDescription = hasContent(description);
  return (
    <fieldset
      aria-describedby={hasDescription ? descriptionId : undefined}
      className={cn('m-0 min-w-0 border-0 p-0', className)}
    >
      <legend
        className={cn('mb-1.5 p-0 text-sm font-medium text-ink', legendHidden && 'sr-only')}
      >
        {legend}
      </legend>
      {hasDescription ? (
        <p id={descriptionId} className="-mt-0.5 mb-3 text-xs text-ink-3">
          {description}
        </p>
      ) : null}
      <div className="flex flex-col gap-4">{children}</div>
    </fieldset>
  );
}
