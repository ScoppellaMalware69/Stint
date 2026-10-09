import { createContext, use } from 'react';

/** True below the app shell's <main>, so shared views (e.g. the error page) can skip their own chrome. */
export const ShellContext = createContext(false);

export function useIsInsideShell(): boolean {
  return use(ShellContext);
}
