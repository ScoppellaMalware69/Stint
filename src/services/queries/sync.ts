import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { subscribeToExternalChanges } from '@/services/api';
import { queryKeys } from './keys';

/** Refreshes all cached data when another browser tab changes it. Mount once, near the root. */
export function useCrossTabSync(): void {
  const queryClient = useQueryClient();
  useEffect(
    () =>
      subscribeToExternalChanges(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.root });
      }),
    [queryClient],
  );
}
