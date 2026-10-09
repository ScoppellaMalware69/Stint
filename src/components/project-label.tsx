import { ColorDot } from '@/components/ui/color-dot';
import type { Client, Project } from '@/domain/models';
import { cn } from '@/lib/cn';

export interface ProjectLabelProps {
  project: Project | null | undefined;
  client?: Client | null;
  /** Show the client name after the project name. */
  showClient?: boolean;
  noneLabel?: string;
  className?: string;
}

/**
 * Project identity used everywhere a project is mentioned: colour swatch + name
 * (+ client). The swatch carries identity next to the text, never instead of it.
 */
export function ProjectLabel({
  project,
  client,
  showClient = true,
  noneLabel = 'No project',
  className,
}: ProjectLabelProps) {
  if (!project) {
    return (
      <span className={cn('inline-flex min-w-0 items-center gap-2 text-ink-3', className)}>
        <ColorDot color="other" />
        <span className="truncate">{noneLabel}</span>
      </span>
    );
  }

  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <ColorDot color={project.color} />
      <span className="truncate text-ink">{project.name}</span>
      {showClient && client ? (
        <span className="truncate text-ink-3">· {client.name}</span>
      ) : null}
    </span>
  );
}
