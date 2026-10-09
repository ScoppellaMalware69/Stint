import { useLayoutEffect, useRef } from 'react';

/** Where the active column sits, in container pixels. */
interface TooltipAnchor {
  left: number;
  right: number;
  center: number;
  top: number;
}

interface Size {
  width: number;
  height: number;
}

interface TooltipRow {
  id: string;
  color: string;
  value: string;
  label: string;
}

interface ColumnChartTooltipProps {
  anchor: TooltipAnchor;
  bounds: Size;
  title: string;
  total: string;
  rows: readonly TooltipRow[];
}

const OFFSET = 8;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

/**
 * Prefers a spot centred above the column; when the column is too tall for that, sits
 * beside it (right first, then left). Always clamped inside the chart container.
 */
function placeTooltip(anchor: TooltipAnchor, size: Size, bounds: Size): { x: number; y: number } {
  const maxX = bounds.width - size.width;
  const above = anchor.top - size.height - OFFSET;
  if (above >= 0) return { x: clamp(anchor.center - size.width / 2, 0, maxX), y: above };

  const y = clamp(anchor.top, 0, bounds.height - size.height);
  if (anchor.right + OFFSET + size.width <= bounds.width) return { x: anchor.right + OFFSET, y };
  if (anchor.left - OFFSET - size.width >= 0) return { x: anchor.left - OFFSET - size.width, y };
  return { x: clamp(anchor.center - size.width / 2, 0, maxX), y: 0 };
}

/**
 * Hover/focus readout for one column: category, total, then one row per non-zero series
 * (value first, name second, keyed by a short line in the series colour).
 * Hidden from assistive tech because the focused column's aria-label says the same.
 */
export function ColumnChartTooltip({
  anchor,
  bounds,
  title,
  total,
  rows,
}: ColumnChartTooltipProps) {
  const ref = useRef<HTMLDivElement>(null);

  // Positioned imperatively after layout so the measured size is exact and nothing flashes.
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const { x, y } = placeTooltip(
      anchor,
      { width: element.offsetWidth, height: element.offsetHeight },
      bounds,
    );
    element.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
  });

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none absolute top-0 left-0 z-10 w-max max-w-60 rounded-md border border-line bg-surface px-3 py-2 shadow-pop"
    >
      <p className="text-xs text-ink-2">{title}</p>
      <p className="text-sm font-semibold text-ink tabular-nums">{total}</p>
      {rows.length > 0 && (
        <ul className="mt-1.5 space-y-1 border-t border-line pt-1.5 text-xs">
          {rows.map((row) => (
            <li key={row.id} className="flex items-center gap-2">
              <svg width="12" height="2" className="shrink-0" aria-hidden="true">
                <rect width="12" height="2" rx="1" fill={row.color} />
              </svg>
              <span className="font-medium text-ink tabular-nums">{row.value}</span>
              <span className="min-w-0 truncate text-ink-2">{row.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
