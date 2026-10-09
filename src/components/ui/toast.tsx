import { CircleAlert, CircleCheck, X } from 'lucide-react';
import { Toast as RadixToast } from 'radix-ui';
import { useEffect, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import { buttonVariants } from './button';
import { IconButton } from './icon-button';

type ToastTone = 'neutral' | 'success' | 'danger';

interface ToastOptions {
  title: string;
  description?: string;
  tone?: ToastTone;
  action?: {
    label: string;
    /** Describes how to do the same thing without the toast (required by Radix for screen readers). */
    altText?: string;
    onClick: () => void;
  };
  durationMs?: number;
}

interface ToastRecord extends ToastOptions {
  id: number;
  open: boolean;
}

const DEFAULT_DURATION_MS = 5000;
const MAX_TOASTS = 4;
/** Long enough for the exit animation before the record is dropped. */
const REMOVE_DELAY_MS = 300;

// Module-level store so `toast()` can be called from anywhere (mutation callbacks, etc.).
let toasts: readonly ToastRecord[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function setToasts(next: readonly ToastRecord[]): void {
  toasts = next;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): readonly ToastRecord[] {
  return toasts;
}

function dismiss(id: number): void {
  setToasts(toasts.map((item) => (item.id === id ? { ...item, open: false } : item)));
  setTimeout(() => {
    setToasts(toasts.filter((item) => item.id !== id));
  }, REMOVE_DELAY_MS);
}

/** Shows a notification. Rendered by the app-level <Toaster />. */
// eslint-disable-next-line react-refresh/only-export-components -- the spec pairs toast() with its Toaster; this file only full-reloads on edit
export function toast(options: ToastOptions): void {
  setToasts([...toasts, { ...options, id: nextId++, open: true }].slice(-MAX_TOASTS));
}

const TONE_ICONS = {
  success: { icon: CircleCheck, className: 'text-success' },
  danger: { icon: CircleAlert, className: 'text-danger' },
} as const;

function ToastItem({ item }: { item: ToastRecord }) {
  const toneIcon = item.tone === 'success' || item.tone === 'danger' ? TONE_ICONS[item.tone] : null;
  return (
    <RadixToast.Root
      open={item.open}
      onOpenChange={(open) => {
        if (!open) dismiss(item.id);
      }}
      duration={item.durationMs ?? DEFAULT_DURATION_MS}
      // Failures interrupt (assertive); confirmations wait their turn (polite).
      type={item.tone === 'danger' ? 'foreground' : 'background'}
      className="flex items-start gap-3 rounded-lg border border-line bg-surface p-4 text-ink shadow-pop data-[state=closed]:animate-fade-out data-[state=open]:animate-rise-in data-[swipe=cancel]:translate-x-0 data-[swipe=cancel]:transition-transform data-[swipe=end]:translate-x-(--radix-toast-swipe-end-x) data-[swipe=end]:animate-fade-out data-[swipe=move]:translate-x-(--radix-toast-swipe-move-x)"
    >
      {toneIcon ? (
        <toneIcon.icon aria-hidden className={cn('mt-0.5 size-4 shrink-0', toneIcon.className)} />
      ) : null}
      <div className="min-w-0 flex-1">
        <RadixToast.Title className="text-sm font-semibold">{item.title}</RadixToast.Title>
        {/* The {' '} text nodes (invisible between blocks) keep words apart in the
            text Radix collects for the screen-reader announcement. */}
        {item.description ? (
          <>
            {' '}
            <RadixToast.Description className="mt-0.5 text-sm text-ink-2">
              {item.description}
            </RadixToast.Description>
          </>
        ) : null}
        {item.action ? (
          <>
            {' '}
            <RadixToast.Action
              altText={item.action.altText ?? item.action.label}
              className={buttonVariants({ variant: 'secondary', size: 'sm', className: 'mt-3' })}
              onClick={item.action.onClick}
            >
              {item.action.label}
            </RadixToast.Action>
          </>
        ) : null}
      </div>
      <RadixToast.Close asChild>
        <IconButton
          label="Dismiss notification"
          icon={X}
          size="icon-sm"
          showTooltip={false}
          className="-mt-1.5 -me-1.5"
        />
      </RadixToast.Close>
    </RadixToast.Root>
  );
}

/**
 * Renders queued toasts. Mount once near the app root. Bottom-right from `sm` up,
 * full width with 16px margins on phones; `--toast-offset` lifts it above bottom bars.
 * F8 moves focus to the notifications region.
 */
export function Toaster() {
  const items = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Toasts belong to the mounted viewport; clearing on unmount keeps tests and remounts clean.
  useEffect(() => () => setToasts([]), []);

  return (
    <RadixToast.Provider duration={DEFAULT_DURATION_MS} swipeDirection="right">
      {items.map((item) => (
        <ToastItem key={item.id} item={item} />
      ))}
      <RadixToast.Viewport className="fixed inset-x-4 bottom-(--toast-offset,16px) z-100 m-0 flex list-none flex-col gap-2 p-0 sm:start-auto sm:end-4 sm:w-96" />
    </RadixToast.Provider>
  );
}
