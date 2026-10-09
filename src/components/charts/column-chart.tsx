import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { cn } from '@/lib/cn';
import { nonZeroReadings } from './chart-data';
import { ColumnChartTooltip } from './column-chart-tooltip';
import { computeColumnLayout, X_LABEL_BASELINE, type ColumnGeometry } from './column-layout';
import type { ValueUnit } from './scale';
import type { ChartSeries, ColumnDatum } from './types';
import { useElementWidth } from './use-element-width';

/** Used until the container has been measured (and in jsdom, which has no layout). */
const FALLBACK_WIDTH = 640;
const DIMMED_OPACITY = 0.45;

export interface ColumnChartProps {
  data: readonly ColumnDatum[];
  series: readonly ChartSeries[];
  formatValue: (value: number) => string;
  /** Tick label formatter. Defaults to "Nh" for `valueUnit="seconds"`, else `formatValue`. */
  formatAxisValue?: (value: number) => string;
  /** Plot height in px; the value-label and x-axis bands are added to it. */
  height?: number;
  ariaLabel: string;
  /** Column whose axis label is emphasised (e.g. today). */
  highlightId?: string;
  /** Seconds get hour-based ticks (0 / 2h / 4h …). */
  valueUnit?: ValueUnit;
}

function columnAriaLabel(
  column: ColumnGeometry,
  series: readonly ChartSeries[],
  formatValue: (value: number) => string,
): string {
  const total = formatValue(column.total);
  if (series.length < 2) return `${column.datum.fullLabel}: ${total}`;
  const parts = nonZeroReadings(column.datum, series).map(
    (reading) => `${reading.label}: ${formatValue(reading.value)}`,
  );
  return [`${column.datum.fullLabel}: ${total} total`, ...parts].join('; ');
}

/**
 * Responsive SVG column chart, stacked when there is more than one series.
 * Each column band is a single hover/focus target (roving tabindex, arrow keys) that
 * shows the same tooltip on hover and keyboard focus.
 */
export function ColumnChart({
  data,
  series,
  formatValue,
  formatAxisValue,
  height = 200,
  ariaLabel,
  highlightId,
  valueUnit,
}: ColumnChartProps) {
  const { ref: containerRef, nodeRef, width: measuredWidth } = useElementWidth<HTMLDivElement>();
  const width = measuredWidth ?? FALLBACK_WIDTH;
  const highlightIndex =
    highlightId === undefined ? -1 : data.findIndex((datum) => datum.id === highlightId);

  const layout = useMemo(
    () =>
      computeColumnLayout({
        data,
        series,
        width,
        plotHeight: height,
        unit: valueUnit,
        formatValue,
        formatAxisValue,
        highlightIndex,
      }),
    [data, series, width, height, valueUnit, formatValue, formatAxisValue, highlightIndex],
  );

  const hitTargets = useRef<(SVGRectElement | null)[]>([]);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [focusedIndex, setFocusedIndex] = useState<number | null>(null);
  const [rovingIndex, setRovingIndex] = useState(0);
  const [dismissed, setDismissed] = useState(false);

  const count = layout.columns.length;
  const tabStop = Math.min(rovingIndex, Math.max(0, count - 1));
  const activeIndex = dismissed ? null : (hoverIndex ?? focusedIndex);
  const active = activeIndex === null ? undefined : layout.columns[activeIndex];
  const tooltipVisible = active !== undefined;

  // Escape dismisses the tooltip wherever focus is (WCAG 1.4.13); a tap outside the
  // chart clears a touch "hover", which never receives a pointerleave.
  useEffect(() => {
    if (!tooltipVisible) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setDismissed(true);
    };
    const onPointerDown = (event: globalThis.PointerEvent) => {
      const container = nodeRef.current;
      if (container && event.target instanceof Node && !container.contains(event.target)) {
        setHoverIndex(null);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [tooltipVisible, nodeRef]);

  const handleKeyDown = (event: KeyboardEvent<SVGRectElement>, index: number) => {
    let next: number;
    switch (event.key) {
      case 'ArrowRight':
        next = Math.min(index + 1, count - 1);
        break;
      case 'ArrowLeft':
        next = Math.max(index - 1, 0);
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = count - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    hitTargets.current[next]?.focus();
  };

  const handlePointerLeave = (event: PointerEvent<SVGGElement>) => {
    // Touch pointers "leave" as soon as the finger lifts; keep the tapped column shown.
    if (event.pointerType !== 'touch') setHoverIndex(null);
  };

  return (
    <div ref={containerRef} className="relative w-full min-w-0">
      <svg
        role="group"
        aria-label={ariaLabel}
        width={layout.width}
        height={layout.height}
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        className="block h-auto max-w-full overflow-visible select-none"
      >
        <g aria-hidden="true">
          {layout.ticks.map((tick) => (
            <g key={tick.value}>
              {tick.value > 0 && (
                <line
                  x1={layout.plotLeft}
                  x2={layout.plotRight}
                  y1={tick.y}
                  y2={tick.y}
                  className="stroke-chart-grid"
                  strokeWidth={1}
                  shapeRendering="crispEdges"
                />
              )}
              <text
                x={layout.plotLeft - 8}
                y={tick.y}
                dy="0.32em"
                textAnchor="end"
                className="fill-ink-3 text-xs tabular-nums"
              >
                {tick.label}
              </text>
            </g>
          ))}

          {layout.columns.map((column, index) => (
            <g
              key={column.datum.id}
              className="transition-opacity duration-150"
              style={{
                opacity: activeIndex !== null && activeIndex !== index ? DIMMED_OPACITY : 1,
              }}
            >
              {column.segments.map((segment) => (
                <path key={segment.seriesId} d={segment.path} fill={segment.color} />
              ))}
            </g>
          ))}

          <line
            x1={layout.plotLeft}
            x2={layout.plotRight}
            y1={layout.plotBottom + 0.5}
            y2={layout.plotBottom + 0.5}
            className="stroke-chart-axis"
            strokeWidth={1}
            shapeRendering="crispEdges"
          />

          {layout.columns.map((column, index) =>
            column.labelX === null ? null : (
              <text
                key={column.datum.id}
                x={column.labelX}
                y={layout.plotBottom + X_LABEL_BASELINE}
                textAnchor="middle"
                className={cn(
                  'text-xs',
                  index === highlightIndex ? 'fill-ink font-semibold' : 'fill-ink-3',
                )}
              >
                {column.datum.label}
              </text>
            ),
          )}

          {layout.valueLabel && (
            <text
              x={layout.valueLabel.x}
              y={layout.valueLabel.y}
              textAnchor="middle"
              strokeLinejoin="round"
              className="fill-ink stroke-surface stroke-3 text-xs font-medium tabular-nums [paint-order:stroke]"
            >
              {layout.valueLabel.text}
            </text>
          )}
        </g>

        <g onPointerLeave={handlePointerLeave}>
          {layout.columns.map((column, index) => (
            <rect
              key={column.datum.id}
              ref={(element) => {
                hitTargets.current[index] = element;
              }}
              x={column.bandX}
              y={0}
              width={column.bandWidth}
              height={layout.height}
              fill="transparent"
              role="img"
              aria-label={columnAriaLabel(column, series, formatValue)}
              tabIndex={index === tabStop ? 0 : -1}
              onPointerEnter={() => {
                setHoverIndex(index);
                setDismissed(false);
              }}
              onFocus={() => {
                setFocusedIndex(index);
                setRovingIndex(index);
                setDismissed(false);
              }}
              onBlur={() => setFocusedIndex(null)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            />
          ))}
        </g>
      </svg>

      {active && (
        <ColumnChartTooltip
          anchor={{
            left: active.barX,
            right: active.barX + active.barWidth,
            center: active.centerX,
            top: active.topY,
          }}
          bounds={{ width: layout.width, height: layout.height }}
          title={active.datum.fullLabel}
          total={formatValue(active.total)}
          rows={
            series.length < 2
              ? []
              : nonZeroReadings(active.datum, series).map((reading) => ({
                  id: reading.id,
                  color: reading.color,
                  value: formatValue(reading.value),
                  label: reading.label,
                }))
          }
        />
      )}
    </div>
  );
}
