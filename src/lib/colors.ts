import { PROJECT_COLORS, type ProjectColor } from '@/domain/models';

/** Colour used for "Other" / "No project" buckets in charts and lists. */
export type DataColor = ProjectColor | 'other';

/**
 * CSS colour for a data hue. Values come from the validated categorical palette in
 * `styles/index.css` and switch automatically between light and dark themes.
 */
export function dataColorVar(color: DataColor): string {
  return `var(--data-${color})`;
}

export const PROJECT_COLOR_LABELS: Record<ProjectColor, string> = {
  blue: 'Blue',
  orange: 'Orange',
  aqua: 'Aqua',
  yellow: 'Yellow',
  magenta: 'Magenta',
  green: 'Green',
  violet: 'Violet',
  red: 'Red',
};

/**
 * Picks the colour for a new project: the first palette slot (in the fixed,
 * colour-blind-safe order) used by the fewest existing projects.
 */
export function suggestProjectColor(usedColors: readonly ProjectColor[]): ProjectColor {
  const counts = new Map<ProjectColor, number>(PROJECT_COLORS.map((color) => [color, 0]));
  for (const color of usedColors) counts.set(color, (counts.get(color) ?? 0) + 1);
  let best: ProjectColor = PROJECT_COLORS[0];
  for (const color of PROJECT_COLORS) {
    if ((counts.get(color) ?? 0) < (counts.get(best) ?? 0)) best = color;
  }
  return best;
}
