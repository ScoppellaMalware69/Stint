import { useQuery } from '@tanstack/react-query';
import type { InvoiceCreateInput, InvoiceDetailsInput, InvoiceStatus } from '@/domain/models';
import { parseDateKey } from '@/lib/dates';
import { api } from '@/services/api';
import { queryKeys } from './keys';
import { useInvalidatingMutation } from './mutation';

export function useInvoices() {
  return useQuery({ queryKey: queryKeys.invoices(), queryFn: () => api.invoices.list() });
}

/** Fails with an ApiError NOT_FOUND when the invoice does not exist; idle without an id. */
export function useInvoice(id: string | undefined) {
  return useQuery({
    queryKey: queryKeys.invoice(id ?? ''),
    queryFn: () => api.invoices.get(id ?? ''),
    enabled: id !== undefined && id !== '',
  });
}

export function useCreateInvoice() {
  return useInvalidatingMutation((input: InvoiceCreateInput) => api.invoices.create(input));
}

export function useUpdateInvoiceDetails() {
  return useInvalidatingMutation(({ id, input }: { id: string; input: InvoiceDetailsInput }) =>
    api.invoices.updateDetails(id, input),
  );
}

export function useSetInvoiceStatus() {
  return useInvalidatingMutation(({ id, status }: { id: string; status: InvoiceStatus }) =>
    api.invoices.setStatus(id, status),
  );
}

export function useDeleteInvoice() {
  return useInvalidatingMutation((id: string) => api.invoices.remove(id));
}

/** The number an invoice issued on `issueDate` would get. Idle until the date is valid. */
export function useInvoiceNumberPreview(issueDate: string) {
  return useQuery({
    queryKey: queryKeys.invoiceNumberPreview(issueDate),
    queryFn: () => api.invoices.previewNumber(issueDate),
    enabled: parseDateKey(issueDate) !== null,
  });
}
