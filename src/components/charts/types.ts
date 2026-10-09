/** One stacked layer of a column chart. `color` is any CSS colour, e.g. `dataColorVar('blue')`. */
export interface ChartSeries {
  id: string;
  label: string;
  color: string;
}

/**
 * One column (category) of a column chart. `label` is the short axis label ("Mon"),
 * `fullLabel` the unambiguous one used in tooltips, aria labels and tables ("Mon 6 Oct").
 * `values` is keyed by series id; missing keys count as zero.
 */
export interface ColumnDatum {
  id: string;
  label: string;
  fullLabel: string;
  values: Record<string, number>;
}
