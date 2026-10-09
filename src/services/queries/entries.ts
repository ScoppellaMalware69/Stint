import { keepPreviousData, useQuery } from '@tanstack/react-query';
import type { TimeEntry, TimeEntryInput } from '@/domain/models';
import { api, type EntryQuery } from '@/services/api';
import { queryKeys } from './keys';
import { useInvalidatingMutation } from './mutation';

export interface UseEntriesOptions {
  /** Keep showing the previous result while a new query (e.g. another week) loads. */
  keepPrevious?: boolean;
  enabled?: boolean;
}

export function useEntries(query?: EntryQuery, options: UseEntriesOptions = {}) {
  return useQuery({
    queryKey: queryKeys.entries(query),
    queryFn: () => api.entries.list(query),
    placeholderData: options.keepPrevious ? keepPreviousData : undefined,
    enabled: options.enabled ?? true,
  });
}

export function useCreateEntry() {
  return useInvalidatingMutation((input: TimeEntryInput) => api.entries.create(input));
}

export function useUpdateEntry() {
  return useInvalidatingMutation(({ id, input }: { id: string; input: TimeEntryInput }) =>
    api.entries.update(id, input),
  );
}

/** Resolves to the removed entry so the UI can offer undo through `useRestoreEntry`. */
export function useDeleteEntry() {
  return useInvalidatingMutation((id: string) => api.entries.remove(id));
}

export function useRestoreEntry() {
  return useInvalidatingMutation((entry: TimeEntry) => api.entries.restore(entry));
}

export function useDuplicateEntry() {
  return useInvalidatingMutation((id: string) => api.entries.duplicate(id));
}
