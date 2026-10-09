import { describe, expect, it } from 'vitest';
import { PROJECT_COLORS, type ProjectColor } from '@/domain/models';
import { PROJECT_COLOR_LABELS, dataColorVar, suggestProjectColor } from '@/lib/colors';

describe('colors', () => {
  it('maps data colours to CSS variables', () => {
    expect(dataColorVar('blue')).toBe('var(--data-blue)');
    expect(dataColorVar('other')).toBe('var(--data-other)');
  });

  it('labels every project colour', () => {
    for (const color of PROJECT_COLORS) expect(PROJECT_COLOR_LABELS[color]).toMatch(/^[A-Z][a-z]+$/);
  });

  const allButRed = PROJECT_COLORS.filter((color) => color !== 'red');

  it.each<[readonly ProjectColor[], ProjectColor]>([
    [[], 'blue'],
    [['blue'], 'orange'],
    [['blue', 'orange'], 'aqua'],
    [['orange'], 'blue'],
    [['red', 'red'], 'blue'],
    [allButRed, 'red'],
    [PROJECT_COLORS, 'blue'],
    [[...PROJECT_COLORS, 'blue'], 'orange'],
  ])('suggestProjectColor(%j) → %s', (used, expected) => {
    expect(suggestProjectColor(used)).toBe(expected);
  });
});
