/**
 * Referential-integrity checks for a whole database (used before importing a backup).
 * Schema validation alone cannot catch these: every record can be valid on its own
 * while pointing at records that do not exist.
 */
import type { DatabaseState } from '@/domain/models';

/** More problems than this are summarised in a final "and N more" message. */
const MAX_ISSUES = 20;

const quote = (text: string) => `“${text}”`;

const entryLabel = (entry: { id: string; description: string }) =>
  entry.description.trim() === ''
    ? `Time entry ${quote(entry.id)}`
    : `Time entry ${quote(entry.description)} (${entry.id})`;

function findDuplicateIds(items: ReadonlyArray<{ id: string }>): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();
  for (const { id } of items) {
    if (seen.has(id)) duplicates.add(id);
    seen.add(id);
  }
  return [...duplicates];
}

/** Returns human-readable descriptions of every problem found (empty when consistent). */
export function findIntegrityIssues(db: DatabaseState): string[] {
  const issues: string[] = [];

  const collections = [
    ['client', db.clients],
    ['project', db.projects],
    ['time entry', db.entries],
    ['invoice', db.invoices],
  ] as const;
  for (const [kind, items] of collections) {
    for (const id of findDuplicateIds(items)) {
      issues.push(`More than one ${kind} has the id ${quote(id)}.`);
    }
  }

  const clientIds = new Set(db.clients.map((client) => client.id));
  const projectIds = new Set(db.projects.map((project) => project.id));
  const entriesById = new Map(db.entries.map((entry) => [entry.id, entry]));
  const invoicesById = new Map(db.invoices.map((invoice) => [invoice.id, invoice]));

  for (const project of db.projects) {
    if (project.clientId !== null && !clientIds.has(project.clientId)) {
      issues.push(
        `Project ${quote(project.name)} refers to a client that does not exist (${project.clientId}).`,
      );
    }
  }

  const running = db.entries.filter((entry) => entry.end === null);
  if (running.length > 1) {
    issues.push(`${running.length} timers are running at once; only one can run at a time.`);
  }

  // Which invoices list each entry, to cross-check against the entry's own invoiceId.
  const invoicesListingEntry = new Map<string, Set<string>>();

  for (const invoice of db.invoices) {
    const label = `Invoice ${quote(invoice.number)}`;
    if (!clientIds.has(invoice.clientId)) {
      issues.push(`${label} refers to a client that does not exist (${invoice.clientId}).`);
    }
    const listed = new Set<string>();
    for (const line of invoice.lines) {
      if (line.projectId !== null && !projectIds.has(line.projectId)) {
        issues.push(
          `${label} has a line for a project that does not exist (${line.projectId}).`,
        );
      }
      for (const entryId of line.entryIds) {
        if (listed.has(entryId)) {
          issues.push(`${label} lists time entry ${quote(entryId)} more than once.`);
          continue;
        }
        listed.add(entryId);
        const invoices = invoicesListingEntry.get(entryId) ?? new Set<string>();
        invoices.add(invoice.id);
        invoicesListingEntry.set(entryId, invoices);

        const entry = entriesById.get(entryId);
        if (!entry) {
          issues.push(`${label} lists a time entry that does not exist (${entryId}).`);
        } else if (entry.invoiceId !== invoice.id) {
          issues.push(
            entry.invoiceId === null
              ? `${entryLabel(entry)} is on ${label} but is not marked as invoiced.`
              : `${entryLabel(entry)} is on ${label} but is marked as belonging to another invoice.`,
          );
        }
      }
    }
  }

  for (const entry of db.entries) {
    const label = entryLabel(entry);
    if (entry.projectId !== null && !projectIds.has(entry.projectId)) {
      issues.push(`${label} refers to a project that does not exist (${entry.projectId}).`);
    }
    if (entry.end !== null && Date.parse(entry.end) <= Date.parse(entry.start)) {
      issues.push(`${label} ends before or at the moment it starts.`);
    }
    if (entry.invoiceId !== null) {
      const invoice = invoicesById.get(entry.invoiceId);
      if (!invoice) {
        issues.push(`${label} refers to an invoice that does not exist (${entry.invoiceId}).`);
      } else if (!invoicesListingEntry.get(entry.id)?.has(invoice.id)) {
        issues.push(`${label} is marked as invoiced on ${quote(invoice.number)} but is not on it.`);
      }
    }
  }

  if (issues.length <= MAX_ISSUES) return issues;
  const shown = issues.slice(0, MAX_ISSUES - 1);
  const hidden = issues.length - shown.length;
  return [...shown, `…and ${hidden} more problems.`];
}
