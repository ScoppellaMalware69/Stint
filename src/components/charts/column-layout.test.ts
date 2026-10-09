import { describe, expect, it } from 'vitest';
import { computeColumnLayout, type ColumnLayoutInput } from './column-layout';
import { estimateTextWidth } from './scale';
import type { ChartSeries, ColumnDatum } from './types';

const HOUR = 3600;
const series: ChartSeries[] = [
  { id: 'a', label: 'Website', color: 'var(--data-blue)' },
  { id: 'b', label: 'Admin', color: 'var(--data-other)' },
];

function datum(id: string, values: Record<string, number>): ColumnDatum {
  return { id, label: id, fullLabel: `Day ${id}`, values };
}

function layout(overrides: Partial<ColumnLayoutInput> = {}) {
  return computeColumnLayout({
    data: [datum('1', { a: 4 * HOUR, b: 3 * HOUR }), datum('2', { a: 2 * HOUR })],
    series,
    width: 640,
    plotHeight: 200,
    unit: 'seconds',
    formatValue: (value) => `${value / HOUR}h`,
    highlightIndex: -1,
    ...overrides,
  });
}

/** Bottom (start of the path) and top (first vertical edge) of a segment path. */
function verticalExtent(path: string): { bottom: number; top: number } {
  const match = /^M[\d.]+,([\d.]+)V([\d.]+)/.exec(path);
  if (!match) throw new Error(`Unexpected path ${path}`);
  return { bottom: Number(match[1]), top: Number(match[2]) };
}

describe('computeColumnLayout', () => {
  it('includes the x-axis band in the total height', () => {
    const result = layout();
    expect(result.height).toBeGreaterThan(result.plotBottom);
    expect(result.plotBottom - result.plotTop).toBe(200);
  });

  it('caps bars at 24px and centres them in their band', () => {
    for (const column of layout().columns) {
      expect(column.barWidth).toBe(24);
      expect(Math.abs(column.barX + column.barWidth / 2 - column.centerX)).toBeLessThanOrEqual(0.5);
    }
  });

  it('stacks from the baseline with a 2px gap and rounds only the top segment', () => {
    const [first] = layout().columns;
    expect(first?.segments.map((segment) => segment.seriesId)).toEqual(['a', 'b']);
    const [bottom, top] = first?.segments ?? [];
    expect(bottom?.path).not.toContain('A');
    expect(top?.path).toContain('A');
    const bottomExtent = verticalExtent(bottom?.path ?? '');
    const topExtent = verticalExtent(top?.path ?? '');
    expect(bottomExtent.bottom).toBe(layout().plotBottom);
    expect(topExtent.bottom).toBeCloseTo(bottomExtent.top - 2, 5);
  });

  it('skips segments thinner than 1px after the gap', () => {
    const result = layout({ data: [datum('1', { a: 8 * HOUR, b: 30 })] });
    const segments = result.columns[0]?.segments ?? [];
    expect(segments.map((segment) => segment.seriesId)).toEqual(['a']);
    expect(segments[0]?.path).toContain('A');
  });

  it('labels only the tallest column', () => {
    expect(layout().valueLabel?.text).toBe('7h');
    expect(layout({ data: [datum('1', {})] }).valueLabel).toBeNull();
  });

  it('thins x labels so they do not collide, but always keeps the highlighted one', () => {
    const data = Array.from({ length: 31 }, (_, index) => ({
      ...datum(String(index), { a: HOUR }),
      label: `${index + 1} Oct`,
    }));
    const result = layout({ data, width: 360, highlightIndex: 4 });
    const shown = result.columns.filter((column) => column.labelX !== null);
    expect(shown.length).toBeLessThan(data.length);
    expect(result.columns[4]?.labelX).not.toBeNull();
    for (let index = 1; index < shown.length; index += 1) {
      const previous = shown[index - 1];
      const current = shown[index];
      if (!previous || !current) continue;
      const minDistance =
        (estimateTextWidth(previous.datum.label, 12) + estimateTextWidth(current.datum.label, 12)) /
        2;
      expect((current.labelX ?? 0) - (previous.labelX ?? 0)).toBeGreaterThanOrEqual(minDistance);
    }
  });
});
