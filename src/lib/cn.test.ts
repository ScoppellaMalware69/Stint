import { describe, expect, it } from 'vitest';
import { cn } from '@/lib/cn';

describe('cn', () => {
  it('joins conditional class names', () => {
    expect(cn('px-2 py-1', false, null, undefined, 0, { 'font-mono': true, hidden: false }, ['gap-2'])).toBe(
      'px-2 py-1 font-mono gap-2',
    );
    expect(cn()).toBe('');
  });

  it.each([
    // Custom colour tokens replace each other without touching font sizes.
    [['text-sm text-ink', 'text-ink-2'], 'text-sm text-ink-2'],
    [['text-base font-semibold text-ink', 'text-ink-3'], 'text-base font-semibold text-ink-3'],
    [['text-ink', 'text-xs'], 'text-ink text-xs'],
    [['bg-surface', 'bg-sunken'], 'bg-sunken'],
    [['bg-ink/5', 'bg-ink/10'], 'bg-ink/10'],
    [['border-line', 'border-line-strong'], 'border-line-strong'],
    [['bg-data-blue', 'bg-data-orange'], 'bg-data-orange'],
    [['fill-data-blue', 'fill-data-other'], 'fill-data-other'],
    [['bg-meter-track', 'bg-meter-track-warning'], 'bg-meter-track-warning'],
    [['text-danger', 'text-success'], 'text-success'],
    // Custom font sizes are sizes, not colours.
    [['text-display', 'text-ink'], 'text-display text-ink'],
    [['text-ink', 'text-hero'], 'text-ink text-hero'],
    [['text-hero', 'text-sm'], 'text-sm'],
    // Custom shadows and animations merge with the built-in ones.
    [['shadow-pop', 'shadow-none'], 'shadow-none'],
    [['shadow-pop', 'shadow-ink/10'], 'shadow-pop shadow-ink/10'],
    [['animate-pop-in', 'animate-none'], 'animate-none'],
    [['data-[state=open]:animate-pop-in', 'data-[state=open]:animate-fade-in'], 'data-[state=open]:animate-fade-in'],
    // Other groups.
    [['font-display', 'font-sans'], 'font-sans'],
    [['font-display', 'font-semibold'], 'font-display font-semibold'],
    [['h-10 lg:h-9', 'h-9 lg:h-8'], 'h-9 lg:h-8'],
    [['rounded-md', 'rounded-lg'], 'rounded-lg'],
  ])('cn(%j) → %j', (inputs, expected) => {
    expect(cn(...inputs)).toBe(expected);
  });
});
