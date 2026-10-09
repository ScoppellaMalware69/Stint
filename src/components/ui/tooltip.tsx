import { Tooltip as RadixTooltip } from 'radix-ui';
import type { ComponentProps, ReactElement, ReactNode } from 'react';

export function TooltipProvider({
  delayDuration = 300,
  ...props
}: ComponentProps<typeof RadixTooltip.Provider>) {
  return <RadixTooltip.Provider delayDuration={delayDuration} {...props} />;
}

interface TooltipProps {
  content: ReactNode;
  /** A single focusable element; it becomes the tooltip trigger. */
  children: ReactElement;
  side?: 'top' | 'right' | 'bottom' | 'left';
}

/** Supplementary hint text. Never put essential information only in a tooltip. */
export function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          collisionPadding={8}
          className="z-50 max-w-xs rounded-sm bg-ink px-2 py-1 text-xs text-ink-inverse shadow-pop data-[state=closed]:animate-fade-out data-[state=delayed-open]:animate-fade-in"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
