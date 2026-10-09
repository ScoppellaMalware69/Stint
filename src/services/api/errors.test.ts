import { describe, expect, it } from 'vitest';
import { ApiError, errorMessage, isApiError } from './errors';

describe('ApiError', () => {
  it('carries a code, a message and optional field errors', () => {
    const error = new ApiError('VALIDATION', 'Name is required', { name: ['Name is required'] });
    expect(error).toBeInstanceOf(Error);
    expect(error).toMatchObject({
      name: 'ApiError',
      code: 'VALIDATION',
      message: 'Name is required',
      fieldErrors: { name: ['Name is required'] },
    });
    expect(new ApiError('NOT_FOUND', 'Gone').fieldErrors).toBeUndefined();
  });

  it('is recognised by isApiError', () => {
    expect(isApiError(new ApiError('LOCKED', 'Locked'))).toBe(true);
    expect(isApiError(new Error('Plain'))).toBe(false);
    expect(isApiError({ code: 'LOCKED' })).toBe(false);
  });
});

describe('errorMessage', () => {
  it('uses the message of errors and strings', () => {
    expect(errorMessage(new ApiError('CONFLICT', 'Already invoiced'))).toBe('Already invoiced');
    expect(errorMessage(new Error('Plain failure'))).toBe('Plain failure');
    expect(errorMessage('Text failure')).toBe('Text failure');
  });

  it('falls back to a generic message', () => {
    for (const value of [undefined, null, 42, {}, new Error(''), '  ']) {
      expect(errorMessage(value)).toBe('Something went wrong. Please try again.');
    }
  });
});
