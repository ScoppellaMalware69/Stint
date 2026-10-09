import { useQuery } from '@tanstack/react-query';
import type { ClientInput } from '@/domain/models';
import { api } from '@/services/api';
import { queryKeys } from './keys';
import { useInvalidatingMutation } from './mutation';

export function useClients() {
  return useQuery({ queryKey: queryKeys.clients(), queryFn: () => api.clients.list() });
}

/** Fails with an ApiError NOT_FOUND when the client does not exist; idle without an id. */
export function useClient(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.client(id ?? ''),
    queryFn: () => api.clients.get(id ?? ''),
    enabled: id !== undefined && id !== '',
  });
}

export function useCreateClient() {
  return useInvalidatingMutation((input: ClientInput) => api.clients.create(input));
}

export function useUpdateClient() {
  return useInvalidatingMutation(({ id, input }: { id: string; input: ClientInput }) =>
    api.clients.update(id, input),
  );
}

export function useSetClientArchived() {
  return useInvalidatingMutation(({ id, archived }: { id: string; archived: boolean }) =>
    api.clients.setArchived(id, archived),
  );
}

export function useDeleteClient() {
  return useInvalidatingMutation((id: string) => api.clients.remove(id));
}
