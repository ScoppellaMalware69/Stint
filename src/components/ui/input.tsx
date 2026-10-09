import { useCallback, useState, type ComponentProps, type ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { CONTROL_CLASSES, CONTROL_HEIGHT } from './styles';

type InputProps = ComponentProps<'input'> & {
  invalid?: boolean;
  /** Content shown inside the control before the text, e.g. a currency symbol. */
  leading?: ReactNode;
  /** Content shown inside the control after the text, e.g. a unit. */
  trailing?: ReactNode;
};

/**
 * Tracks an adornment's rendered width so the input can reserve exactly that much
 * padding; adornments vary in width ("€", "CHF", an icon).
 */
function useMeasuredWidth() {
  const [width, setWidth] = useState<number>();
  const ref = useCallback((node: HTMLElement | null) => {
    if (!node) return;
    const update = () => setWidth(node.offsetWidth || undefined);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

const ADORNMENT_CLASSES =
  'pointer-events-none absolute inset-y-0 flex items-center text-ink-3 select-none [&_button]:pointer-events-auto';

export function Input({
  invalid,
  leading,
  trailing,
  className,
  style,
  'aria-invalid': ariaInvalid,
  ...props
}: InputProps) {
  const [leadingRef, leadingWidth] = useMeasuredWidth();
  const [trailingRef, trailingWidth] = useMeasuredWidth();
  const hasLeading = leading !== undefined && leading !== null;
  const hasTrailing = trailing !== undefined && trailing !== null;

  const input = (
    <input
      aria-invalid={invalid || ariaInvalid || undefined}
      className={cn(
        CONTROL_CLASSES,
        CONTROL_HEIGHT,
        'px-3',
        hasLeading && 'pl-9',
        hasTrailing && 'pr-9',
        className,
      )}
      style={{
        ...(hasLeading && leadingWidth ? { paddingInlineStart: leadingWidth } : null),
        ...(hasTrailing && trailingWidth ? { paddingInlineEnd: trailingWidth } : null),
        ...style,
      }}
      {...props}
    />
  );

  if (!hasLeading && !hasTrailing) return input;

  // Adornments sit on top of the input (clicks pass through to it), so the input keeps
  // its own border and native focus outline around the whole control.
  return (
    <div className="relative w-full min-w-0">
      {input}
      {hasLeading ? (
        <span ref={leadingRef} className={cn(ADORNMENT_CLASSES, 'start-0 ps-3 pe-2')}>
          {leading}
        </span>
      ) : null}
      {hasTrailing ? (
        <span ref={trailingRef} className={cn(ADORNMENT_CLASSES, 'end-0 ps-2 pe-3')}>
          {trailing}
        </span>
      ) : null}
    </div>
  );
}
