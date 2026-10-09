import { useQuery } from '@tanstack/react-query';
import type { RunningEntryPatch, TimerStartInput } from '@/domain/models';
import { api } from '@/services/api';
import { queryKeys } from './keys';
import { useInvalidatingMutation } from './mutation';

export function useRunningEntry() {
  return useQuery({ queryKey: queryKeys.running(), queryFn: () => api.timer.getRunning() });
}

/*
 * Timer mutations also write the running entry straight into the cache, so the timer
 * widget updates immediately while the other queries refresh.
 */

export function useStartTimer() {
  return useInvalidatingMutation(
    (input: TimerStartInput) => api.timer.start(input),
    (result, queryClient) => queryClient.setQueryData(queryKeys.running(), result.started),
  );
}

export function useStopTimer() {
  return useInvalidatingMutation(
    () => api.timer.stop(),
    (_stopped, queryClient) => queryClient.setQueryData(queryKeys.running(), null),
  );
}

export function useUpdateRunningEntry() {
  return useInvalidatingMutation(
    (patch: RunningEntryPatch) => api.timer.updateRunning(patch),
    (entry, queryClient) => queryClient.setQueryData(queryKeys.running(), entry),
  );
}

export function useDiscardTimer() {
  return useInvalidatingMutation(
    () => api.timer.discard(),
    (_result, queryClient) => queryClient.setQueryData(queryKeys.running(), null),
  );
}
