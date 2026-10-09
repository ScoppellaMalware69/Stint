import { useNavigate } from 'react-router';
import { toast } from '@/components/ui/toast';
import type { Project, TimeEntry } from '@/domain/models';
import { entryDurationSeconds } from '@/domain/time-entries';
import { formatClock } from '@/lib/duration';
import { errorMessage } from '@/services/api/errors';
import { useLookups, useRunningEntry, useStartTimer, useStopTimer } from '@/services/queries';

/** The running entry (if any) with its project resolved for display. */
export function useRunningTimer() {
  const running = useRunningEntry();
  const { data: lookups } = useLookups();
  const entry: TimeEntry | null = running.data ?? null;
  const project: Project | null = entry?.projectId
    ? (lookups?.projectsById.get(entry.projectId) ?? null)
    : null;

  return {
    entry,
    project,
    isPending: running.isPending,
    isError: running.isError,
    refetch: running.refetch,
  };
}

/** What a running timer is about, for compact displays and the document title. */
export function timerLabel(entry: TimeEntry, project: Project | null): string {
  return entry.description.trim() || project?.name || 'Timer running';
}

/**
 * Start/stop with feedback toasts, shared by the sidebar widget and the mobile controls.
 * `mutateAsync` is used on purpose: the control that started a stop may unmount as soon
 * as the timer stops, and per-call mutate callbacks would then never fire.
 */
export function useTimerActions() {
  const navigate = useNavigate();
  const startTimer = useStartTimer();
  const stopTimer = useStopTimer();

  const start = async () => {
    try {
      const { stopped } = await startTimer.mutateAsync({
        description: '',
        projectId: null,
        billable: false,
      });
      toast({
        title: 'Timer started',
        description: stopped
          ? `Previous timer stopped · ${formatClock(entryDurationSeconds(stopped))} saved`
          : 'Add a description and project whenever you like.',
        tone: 'success',
        action: {
          label: 'Add details',
          altText: 'Open the Time page to add details to the running timer',
          onClick: () => void navigate('/time'),
        },
      });
    } catch (error) {
      toast({
        title: "Couldn't start the timer",
        description: errorMessage(error),
        tone: 'danger',
      });
    }
  };

  const stop = async () => {
    try {
      const stopped = await stopTimer.mutateAsync();
      toast(
        stopped
          ? {
              title: `Timer stopped · ${formatClock(entryDurationSeconds(stopped))} saved`,
              tone: 'success',
            }
          : { title: 'No timer was running', tone: 'neutral' },
      );
    } catch (error) {
      toast({ title: "Couldn't stop the timer", description: errorMessage(error), tone: 'danger' });
    }
  };

  return {
    start,
    stop,
    isStarting: startTimer.isPending,
    isStopping: stopTimer.isPending,
  };
}
