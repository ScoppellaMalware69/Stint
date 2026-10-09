import { useMutation, useQueryClient, type QueryClient } from '@tanstack/react-query';
import { queryKeys } from './keys';

/**
 * A mutation that refreshes every cached query once it succeeds. Writes can touch many
 * resources at once (creating an invoice locks entries, starting a timer stops another),
 * so refreshing everything is simpler and safer than tracking each dependency. Awaiting
 * the refresh keeps the mutation pending until the screen can show fresh data.
 */
export function useInvalidatingMutation<TData, TVariables = void>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  onSuccess?: (data: TData, queryClient: QueryClient) => void,
) {
  const queryClient = useQueryClient();
  return useMutation<TData, Error, TVariables>({
    mutationFn,
    onSuccess: async (data) => {
      onSuccess?.(data, queryClient);
      await queryClient.invalidateQueries({ queryKey: queryKeys.root });
    },
  });
}
