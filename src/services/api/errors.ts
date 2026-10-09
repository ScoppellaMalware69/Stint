/**
 * Errors raised by the API layer. Each carries a machine-readable `code` so the UI can
 * react to the kind of failure (for example, map VALIDATION field errors onto a form)
 * instead of parsing messages. Messages are written for people and safe to show as-is.
 */

export type ApiErrorCode = 'VALIDATION' | 'NOT_FOUND' | 'CONFLICT' | 'LOCKED' | 'STORAGE';

export class ApiError extends Error {
  override name = 'ApiError';
  readonly code: ApiErrorCode;
  /** Messages keyed by input field name, present when specific fields caused the error. */
  readonly fieldErrors?: Record<string, string[]>;

  constructor(
    code: ApiErrorCode,
    message: string,
    fieldErrors?: Record<string, string[]>,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.code = code;
    if (fieldErrors !== undefined) this.fieldErrors = fieldErrors;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

const FALLBACK_MESSAGE = 'Something went wrong. Please try again.';

/** A human-readable message for any thrown value, suitable for toasts and error states. */
export function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message.trim() !== '') return error.message;
  if (typeof error === 'string' && error.trim() !== '') return error;
  return FALLBACK_MESSAGE;
}
