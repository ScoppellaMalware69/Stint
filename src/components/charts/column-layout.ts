import { columnTotal, seriesValue } from './chart-data';
import { estimateTextWidth, formatHourTick, niceScale, type ValueUnit } from './scale';
import type { ChartSeries, ColumnDatum } from './types';

/** Axis text is `text-xs` (12px). */
const AXIS_FONT_SIZE = 12;
/** Room above the plot for the value label on the tallest column. */
const TOP_PADDING = 20;
/** Height of the x-axis label band below the baseline (part of the chart height). */
const X_AXIS_BAND = 28;
export const X_LABEL_BASELINE = 18;
const RIGHT_PADDING = 4;
const TICK_LABEL_GAP = 8;
const X_LABEL_GAP = 10;
const MAX_BAR_WIDTH = 24;
const MIN_BAR_WIDTH = 4;
const BAR_BAND_RATIO = 0.55;
/** Surface-coloured gap between stacked segments (and the minimum between columns). */
const SEGMENT_GAP = 2;
const CORNER_RADIUS = 4;
const MIN_SEGMENT_HEIGHT = 1;
const VALUE_LABEL_OFFSET = 6;

export interface ColumnLayoutInput {
  data: readonly ColumnDatum[];
  series: readonly ChartSeries[];
  width: number;
  plotHeight: number;
  unit?: ValueUnit;
  formatValue: (value: number) => string;
  formatAxisValue?: (value: number) => string;
  /** Index of the highlighted column, or -1. Its label is never thinned out. */
  highlightIndex: number;
}

export interface TickGeometry {
  value: number;
  /** Pixel-aligned y for a crisp 1px line. */
  y: number;
  label: string;
}

export interface SegmentGeometry {
  seriesId: string;
  color: string;
  path: string;
}

export interface ColumnGeometry {
  datum: ColumnDatum;
  total: number;
  bandX: number;
  bandWidth: number;
  centerX: number;
  barX: number;
  barWidth: number;
  /** y of the top of the stack (the plot baseline when the total is zero). */
  topY: number;
  segments: SegmentGeometry[];
  /** Axis label position, or null when the label is thinned out to avoid collisions. */
  labelX: number | null;
}

export interface ColumnLayout {
  width: number;
  height: number;
  plotLeft: number;
  plotRight: number;
  plotTop: number;
  plotBottom: number;
  ticks: TickGeometry[];
  columns: ColumnGeometry[];
  valueLabel: { x: number; y: number; text: string } | null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), Math.max(min, max));

function rectPath(x: number, y: number, width: number, height: number): string {
  return `M${round2(x)},${round2(y + height)}V${round2(y)}H${round2(x + width)}V${round2(y + height)}Z`;
}

/** Rounded data end (top), square at the baseline. */
function roundedTopPath(x: number, y: number, width: number, height: number): string {
  const r = round2(Math.min(CORNER_RADIUS, width / 2, height));
  const bottom = round2(y + height);
  return (
    `M${round2(x)},${bottom}V${round2(y + r)}` +
    `A${r},${r} 0 0 1 ${round2(x + r)},${round2(y)}` +
    `H${round2(x + width - r)}` +
    `A${r},${r} 0 0 1 ${round2(x + width)},${round2(y + r)}` +
    `V${bottom}Z`
  );
}

/**
 * Stacks the non-zero series of one column from the baseline in series order.
 * Each segment above another gives up its bottom 2px as a surface-coloured gap; a
 * segment left with less than 1px is skipped (its value stays in the tooltip/table).
 * Only the top drawn segment gets rounded corners.
 */
function stackSegments(
  datum: ColumnDatum,
  series: readonly ChartSeries[],
  barX: number,
  barWidth: number,
  yOf: (value: number) => number,
): SegmentGeometry[] {
  const drawn: { seriesId: string; color: string; top: number; height: number }[] = [];
  let cumulative = 0;
  for (const item of series) {
    const value = seriesValue(datum, item.id);
    if (value === 0) continue;
    const rawBottom = yOf(cumulative);
    cumulative += value;
    const top = yOf(cumulative);
    const bottom = drawn.length > 0 ? rawBottom - SEGMENT_GAP : rawBottom;
    const height = bottom - top;
    if (height < MIN_SEGMENT_HEIGHT) continue;
    drawn.push({ seriesId: item.id, color: item.color, top, height });
  }
  return drawn.map((segment, index) => ({
    seriesId: segment.seriesId,
    color: segment.color,
    path:
      index === drawn.length - 1
        ? roundedTopPath(barX, segment.top, barWidth, segment.height)
        : rectPath(barX, segment.top, barWidth, segment.height),
  }));
}

/**
 * Indexes of the x labels to draw: every `stride`-th label so estimated widths never
 * collide, plus the highlighted one (displacing neighbours that would touch it).
 */
function visibleLabelIndexes(
  labels: readonly string[],
  bandWidth: number,
  highlightIndex: number,
): Set<number> {
  const widest = Math.max(0, ...labels.map((label) => estimateTextWidth(label, AXIS_FONT_SIZE)));
  const stride = bandWidth > 0 ? Math.max(1, Math.ceil((widest + X_LABEL_GAP) / bandWidth)) : 1;
  const visible = new Set<number>();
  for (let index = 0; index < labels.length; index += stride) visible.add(index);
  if (highlightIndex >= 0 && highlightIndex < labels.length && !visible.has(highlightIndex)) {
    for (const index of [...visible]) {
      if (Math.abs(index - highlightIndex) < stride) visible.delete(index);
    }
    visible.add(highlightIndex);
  }
  return visible;
}

/** Pure geometry for `ColumnChart`; all coordinates are SVG user units (px). */
export function computeColumnLayout(input: ColumnLayoutInput): ColumnLayout {
  const { data, series, width, unit, formatValue, highlightIndex } = input;
  const formatTick = input.formatAxisValue ?? (unit === 'seconds' ? formatHourTick : formatValue);

  const totals = data.map((datum) => columnTotal(datum, series));
  const scale = niceScale(Math.max(0, ...totals), unit);

  const plotTop = TOP_PADDING;
  const plotBottom = plotTop + Math.max(1, Math.round(input.plotHeight));
  const height = plotBottom + X_AXIS_BAND;
  const yOf = (value: number) => plotBottom - (value / scale.max) * (plotBottom - plotTop);

  const tickLabels = scale.ticks.map((value) => formatTick(value));
  const widestTick = Math.max(
    ...tickLabels.map((label) => estimateTextWidth(label, AXIS_FONT_SIZE)),
  );
  const plotLeft = Math.ceil(widestTick + TICK_LABEL_GAP);
  const plotRight = Math.max(plotLeft + 1, width - RIGHT_PADDING);
  const ticks = scale.ticks.map((value, index) => ({
    value,
    y: Math.round(yOf(value)) + 0.5,
    label: tickLabels[index] ?? '',
  }));

  const bandWidth = data.length > 0 ? (plotRight - plotLeft) / data.length : 0;
  const barWidth = Math.max(
    1,
    Math.round(
      Math.min(
        MAX_BAR_WIDTH,
        Math.max(MIN_BAR_WIDTH, bandWidth * BAR_BAND_RATIO),
        bandWidth - SEGMENT_GAP,
      ),
    ),
  );
  const labelIndexes = visibleLabelIndexes(
    data.map((datum) => datum.label),
    bandWidth,
    highlightIndex,
  );
  const clampLabelX = (x: number, text: string) => {
    const half = estimateTextWidth(text, AXIS_FONT_SIZE) / 2;
    return round2(clamp(x, half, width - half));
  };

  const columns = data.map((datum, index): ColumnGeometry => {
    const total = totals[index] ?? 0;
    const bandX = plotLeft + index * bandWidth;
    const centerX = bandX + bandWidth / 2;
    const barX = Math.round(centerX - barWidth / 2);
    return {
      datum,
      total,
      bandX: round2(bandX),
      bandWidth: round2(bandWidth),
      centerX: round2(centerX),
      barX,
      barWidth,
      topY: round2(yOf(total)),
      segments: stackSegments(datum, series, barX, barWidth, yOf),
      labelX: labelIndexes.has(index) ? clampLabelX(centerX, datum.label) : null,
    };
  });

  let tallest: ColumnGeometry | undefined;
  for (const column of columns) {
    if (column.total > 0 && (!tallest || column.total > tallest.total)) tallest = column;
  }
  let valueLabel: ColumnLayout['valueLabel'] = null;
  if (tallest) {
    const text = formatValue(tallest.total);
    valueLabel = {
      x: clampLabelX(tallest.centerX, text),
      y: tallest.topY - VALUE_LABEL_OFFSET,
      text,
    };
  }

  return { width, height, plotLeft, plotRight, plotTop, plotBottom, ticks, columns, valueLabel };
}
