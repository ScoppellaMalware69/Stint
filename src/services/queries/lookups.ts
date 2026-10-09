import { useMemo } from 'react';
import { createBillingContext, type BillingContext } from '@/domain/billing';
import type { Client, Project, Settings } from '@/domain/models';
import { useClients } from './clients';
import { useProjects } from './projects';
import { useSettings } from './settings';

/** Reference data most screens need together, plus lookup maps for rendering lists. */
export interface Lookups {
  settings: Settings;
  /** Sorted by name, archived included. */
  clients: Client[];
  /** Sorted by name, archived included. */
  projects: Project[];
  projectsById: ReadonlyMap<string, Project>;
  clientsById: ReadonlyMap<string, Client>;
  billing: BillingContext;
}

export function useLookups(): {
  data: Lookups | undefined;
  isPending: boolean;
  error: Error | null;
} {
  const settings = useSettings();
  const clients = useClients();
  const projects = useProjects();

  const data = useMemo((): Lookups | undefined => {
    if (!settings.data || !clients.data || !projects.data) return undefined;
    const billing = createBillingContext(settings.data, projects.data, clients.data);
    return {
      settings: settings.data,
      clients: clients.data,
      projects: projects.data,
      projectsById: billing.projectsById,
      clientsById: billing.clientsById,
      billing,
    };
  }, [settings.data, clients.data, projects.data]);

  return {
    data,
    isPending: settings.isPending || clients.isPending || projects.isPending,
    error: settings.error ?? clients.error ?? projects.error,
  };
}
