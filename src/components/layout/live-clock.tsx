import type { TimeEntry } from '@/domain/models';
import { entryDurationSeconds } from '@/domain/time-entries';
import { useNow } from '@/hooks/use-now';
import { formatClock } from '@/lib/duration';

/**
 * Elapsed time of a running entry as H:MM:SS. Kept as a leaf so only this text
 * re-renders every second. Not a live region: announcing every tick would be noise.
 */
export function LiveClock({ entry }: { entry: Pick<TimeEntry, 'start' | 'end'> }) {
  const now = useNow();
  return <>{formatClock(entryDurationSeconds(entry, now))}</>;
}
