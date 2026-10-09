import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { ThemeProvider } from '@/app/theme';
import { createQueryClient } from '@/app/query-client';
import { ConfirmProvider } from '@/components/ui/confirm';
import { Toaster } from '@/components/ui/toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useCrossTabSync } from '@/services/queries';

function CrossTabSync() {
  useCrossTabSync();
  return null;
}

/** Everything the app needs above the router: data cache, theme, overlays and toasts. */
export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <CrossTabSync />
      <ThemeProvider>
        <TooltipProvider>
          <ConfirmProvider>
            {children}
            <Toaster />
          </ConfirmProvider>
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
