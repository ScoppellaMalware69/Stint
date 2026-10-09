import { AlertDialog } from 'radix-ui';
import {
  createContext,
  use,
  useCallback,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/cn';
import { buttonVariants } from './button';
import { OVERLAY_CLASSES, PANEL_CLASSES } from './styles';

interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  tone?: 'default' | 'danger';
}

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>;

const ConfirmContext = createContext<ConfirmFn | null>(null);

/** Hosts a single confirmation dialog that any descendant can open with `useConfirm()`. */
export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  // Kept after closing so the content does not disappear during the exit animation.
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const resolveRef = useRef<((confirmed: boolean) => void) | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const confirm = useCallback<ConfirmFn>((next) => {
    // A newer request supersedes a pending one, which counts as cancelled.
    resolveRef.current?.(false);
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    return new Promise<boolean>((resolve) => {
      resolveRef.current = resolve;
      setOptions(next);
      setOpen(true);
    });
  }, []);

  const settle = (confirmed: boolean) => {
    resolveRef.current?.(confirmed);
    resolveRef.current = null;
    setOpen(false);
  };

  const hasDescription = options?.description !== undefined && options.description !== null;

  return (
    <ConfirmContext value={confirm}>
      {children}
      <AlertDialog.Root
        open={open}
        onOpenChange={(next) => {
          if (!next) settle(false);
        }}
      >
        <AlertDialog.Portal>
          <AlertDialog.Overlay className={OVERLAY_CLASSES} />
          <AlertDialog.Content
            {...(hasDescription ? null : { 'aria-describedby': undefined })}
            className={cn(PANEL_CLASSES, 'max-w-md p-5')}
            onCloseAutoFocus={(event) => {
              // There is no Trigger, so return focus to whatever opened the confirmation.
              const target = returnFocusRef.current;
              returnFocusRef.current = null;
              if (target?.isConnected) {
                event.preventDefault();
                target.focus();
              }
            }}
          >
            <AlertDialog.Title className="text-lg font-semibold text-ink">
              {options?.title}
            </AlertDialog.Title>
            {hasDescription ? (
              <AlertDialog.Description className="mt-2 text-sm text-ink-2">
                {options.description}
              </AlertDialog.Description>
            ) : null}
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <AlertDialog.Cancel className={buttonVariants({ variant: 'secondary' })}>
                {options?.cancelLabel ?? 'Cancel'}
              </AlertDialog.Cancel>
              <AlertDialog.Action
                className={buttonVariants({
                  variant: options?.tone === 'danger' ? 'danger' : 'primary',
                })}
                onClick={() => settle(true)}
              >
                {options?.confirmLabel ?? 'Confirm'}
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </ConfirmContext>
  );
}

/** Returns `confirm(options)`, which resolves `true` when the user confirms. */
// eslint-disable-next-line react-refresh/only-export-components -- the spec pairs the hook with its provider; this file only full-reloads on edit
export function useConfirm(): ConfirmFn {
  const confirm = use(ConfirmContext);
  if (!confirm) throw new Error('useConfirm must be used within <ConfirmProvider>');
  return confirm;
}
