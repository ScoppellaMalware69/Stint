import type { ChartSeries, ColumnDatum } from './types';

/** A series value as a plottable magnitude: missing, negative or non-finite values count as zero. */
export function seriesValue(datum: ColumnDatum, seriesId: string): number {
  const value = datum.values[seriesId];
  return value !== undefined && Number.isFinite(value) && value > 0 ? value : 0;
}

export function columnTotal(datum: ColumnDatum, series: readonly ChartSeries[]): number {
  return series.reduce((sum, item) => sum + seriesValue(datum, item.id), 0);
}

export function seriesTotal(data: readonly ColumnDatum[], seriesId: string): number {
  return data.reduce((sum, datum) => sum + seriesValue(datum, seriesId), 0);
}

export function isAllZero(data: readonly ColumnDatum[], series: readonly ChartSeries[]): boolean {
  return data.every((datum) => columnTotal(datum, series) === 0);
}

export interface SeriesReading {
  id: string;
  label: string;
  color: string;
  value: number;
}

/** The non-zero series of one column, in series order (what tooltips and aria labels list). */
export function nonZeroReadings(
  datum: ColumnDatum,
  series: readonly ChartSeries[],
): SeriesReading[] {
  return series
    .map((item) => ({ ...item, value: seriesValue(datum, item.id) }))
    .filter((reading) => reading.value > 0);
}
