import { clsx, type ClassValue } from 'clsx';
import { extendTailwindMerge } from 'tailwind-merge';

/**
 * tailwind-merge needs to know the custom theme names, otherwise it can put a custom
 * utility in the wrong group and drop or keep the wrong class: `text-display` would be
 * read as a text colour, and `shadow-pop` as a shadow colour.
 */
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      color: [
        'canvas',
        'surface',
        'sunken',
        'ink',
        'ink-2',
        'ink-3',
        'ink-inverse',
        'line',
        'line-strong',
        'overlay',
        'signal',
        'signal-soft',
        'danger',
        'danger-soft',
        'success',
        'success-soft',
        'warning',
        'warning-soft',
      ],
      text: ['display', 'hero'],
      shadow: ['card', 'pop'],
      animate: [
        'fade-in',
        'fade-out',
        'pop-in',
        'pop-out',
        'sheet-in',
        'sheet-out',
        'rise-in',
        'live',
      ],
    },
  },
});

/** Joins conditional class names and resolves conflicting Tailwind utilities. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
