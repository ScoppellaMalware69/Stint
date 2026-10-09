import type { ComponentProps } from 'react';
import { Select } from '@/components/ui/select';
import type { Client, Project } from '@/domain/models';

export interface ProjectSelectProps
  extends Omit<ComponentProps<'select'>, 'value' | 'onChange' | 'children'> {
  projects: readonly Project[];
  clients: readonly Client[];
  value: string | null;
  onChange: (projectId: string | null) => void;
  /** Label of the empty option (`null` value). */
  noneLabel?: string;
  /** Offer archived projects too. The selected project is always offered, even if archived. */
  includeArchived?: boolean;
  invalid?: boolean;
}

interface ProjectGroup {
  label: string;
  projects: Project[];
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

/**
 * Native project picker grouped by client. A native <select> is used on purpose: it is
 * fully accessible, works with every input method and gives the best experience on phones.
 */
export function ProjectSelect({
  projects,
  clients,
  value,
  onChange,
  noneLabel = 'No project',
  includeArchived = false,
  ...selectProps
}: ProjectSelectProps) {
  const visible = projects.filter(
    (project) => includeArchived || !project.archived || project.id === value,
  );

  const groups: ProjectGroup[] = [...clients]
    .sort(byName)
    .map((client) => ({
      label: client.name,
      projects: visible.filter((project) => project.clientId === client.id).sort(byName),
    }))
    .filter((group) => group.projects.length > 0);

  const internal = visible.filter((project) => project.clientId === null).sort(byName);
  if (internal.length > 0) groups.push({ label: 'Internal', projects: internal });

  return (
    <Select
      {...selectProps}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
    >
      <option value="">{noneLabel}</option>
      {groups.map((group) => (
        <optgroup key={group.label} label={group.label}>
          {group.projects.map((project) => (
            <option key={project.id} value={project.id}>
              {project.archived ? `${project.name} (archived)` : project.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
