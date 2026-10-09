import type { LucideIcon } from 'lucide-react';
import { Button, type ButtonProps } from './button';
import { Tooltip } from './tooltip';

type IconButtonProps = Omit<ButtonProps, 'children' | 'size'> & {
  /** Accessible name; also shown as the tooltip. */
  label: string;
  icon: LucideIcon;
  size?: 'icon' | 'icon-sm';
  showTooltip?: boolean;
};

export function IconButton({
  label,
  icon: Icon,
  size = 'icon',
  variant = 'ghost',
  showTooltip = true,
  ...props
}: IconButtonProps) {
  const button = (
    <Button aria-label={label} size={size} variant={variant} {...props}>
      <Icon aria-hidden className="size-4" />
    </Button>
  );
  return showTooltip ? <Tooltip content={label}>{button}</Tooltip> : button;
}
