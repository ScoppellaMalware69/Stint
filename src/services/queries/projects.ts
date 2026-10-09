import { useQuery } from '@tanstack/react-query';
import type { ProjectInput } from '@/domain/models';
import { api } from '@/services/api';
import { queryKeys } from './keys';
import { useInvalidatingMutation } from './mutation';

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects(), queryFn: () => api.projects.list() });
}

/** Fails with an ApiError NOT_FOUND when the project does not exist; idle without an id. */
export function useProject(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.project(id ?? ''),
    queryFn: () => api.projects.get(id ?? ''),
    enabled: id !== undefined && id !== '',
  });
}

export function useCreateProject() {
  return useInvalidatingMutation((input: ProjectInput) => api.projects.create(input));
}

export function useUpdateProject() {
  return useInvalidatingMutation(({ id, input }: { id: string; input: ProjectInput }) =>
    api.projects.update(id, input),
  );
}

export function useSetProjectArchived() {
  return useInvalidatingMutation(({ id, archived }: { id: string; archived: boolean }) =>
    api.projects.setArchived(id, archived),
  );
}

export function useDeleteProject() {
  return useInvalidatingMutation((id: string) => api.projects.remove(id));
}
