import { useMutation } from '@tanstack/react-query';
import { api } from '@/services/api';
import { useInvalidatingMutation } from './mutation';

/** Builds a backup of all data. It only reads, so no cached data needs refreshing. */
export function useExportBackup() {
  return useMutation({ mutationFn: () => api.data.exportBackup() });
}

/** Validates and imports an untrusted backup (the parsed JSON of a file), replacing all data. */
export function useImportBackup() {
  return useInvalidatingMutation((file: unknown) => api.data.importBackup(file));
}

export function useResetToDemo() {
  return useInvalidatingMutation(() => api.data.resetToDemo());
}

export function useClearAllData() {
  return useInvalidatingMutation(() => api.data.clearAll());
}
