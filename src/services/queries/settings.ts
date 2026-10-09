import { useQuery } from '@tanstack/react-query';
import type { Settings } from '@/domain/models';
import { api } from '@/services/api';
import { queryKeys } from './keys';
import { useInvalidatingMutation } from './mutation';

export function useSettings() {
  return useQuery({ queryKey: queryKeys.settings(), queryFn: () => api.settings.get() });
}

export function useUpdateSettings() {
  return useInvalidatingMutation((patch: Partial<Settings>) => api.settings.update(patch));
}
