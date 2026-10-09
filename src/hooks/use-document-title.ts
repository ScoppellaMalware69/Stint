import { useEffect } from 'react';

const APP_NAME = 'Stint';

/**
 * A tiny title store. Pages register their title; the app shell may register a live
 * title (the running timer) that takes precedence until it is cleared, at which point
 * the current page title comes back.
 */
interface TitleEntry {
  title: string;
}

const pageTitles: TitleEntry[] = [];
let liveTitle: string | null = null;

function applyDocumentTitle(): void {
  const pageTitle = pageTitles.at(-1)?.title;
  document.title = liveTitle ?? (pageTitle ? `${pageTitle} · ${APP_NAME}` : APP_NAME);
}

/** Sets the page title as "Title · Stint" while the calling component is mounted. */
export function useDocumentTitle(title: string): void {
  useEffect(() => {
    const entry: TitleEntry = { title };
    pageTitles.push(entry);
    applyDocumentTitle();
    return () => {
      const index = pageTitles.indexOf(entry);
      if (index !== -1) pageTitles.splice(index, 1);
      applyDocumentTitle();
    };
  }, [title]);
}

/**
 * Overrides the whole document title (e.g. "● 1:23:45 · Design review") while the
 * calling component is mounted and `title` is not null. Used by the app shell only.
 */
export function useLiveDocumentTitle(title: string | null): void {
  useEffect(() => {
    liveTitle = title;
    applyDocumentTitle();
  }, [title]);

  useEffect(
    () => () => {
      liveTitle = null;
      applyDocumentTitle();
    },
    [],
  );
}
