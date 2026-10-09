/**
 * Shared look of text-like form controls (Input, Textarea, Select). Text is 16px below
 * `lg` so iOS Safari does not zoom on focus. `aria-invalid` (set by Field or the
 * `invalid` prop) switches the border to the danger token.
 */
export const CONTROL_CLASSES =
  'w-full min-w-0 rounded-md border border-line-strong bg-surface text-base text-ink transition-colors duration-150 placeholder:text-ink-3 hover:border-ink-3 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-danger lg:text-sm';

/** Single-line controls share the `md` control height. */
export const CONTROL_HEIGHT = 'h-10 lg:h-9';

/** Backdrop shared by dialogs and confirmations. */
export const OVERLAY_CLASSES =
  'fixed inset-0 z-50 bg-overlay data-[state=closed]:animate-fade-out data-[state=open]:animate-fade-in';

/**
 * Floating dialog panel, centred with `inset-0 m-auto` rather than transforms (the
 * pop-in animation animates `transform`). Full width minus 16px margins on phones.
 */
export const PANEL_CLASSES =
  'fixed inset-0 z-50 m-auto flex h-fit max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] flex-col rounded-xl border border-line bg-surface text-ink shadow-pop data-[state=closed]:animate-pop-out data-[state=open]:animate-pop-in';
