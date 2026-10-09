import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useNow } from './use-now';

const START = new Date('2026-10-09T09:00:00Z').getTime();

describe('useNow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(START);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the current time and advances every interval', () => {
    const { result } = renderHook(() => useNow(1000));
    expect(result.current).toBe(START);

    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).toBe(START + 1000);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current).toBe(START + 4000);
  });

  it('shares one timer between components and stops it when nobody listens', () => {
    const first = renderHook(() => useNow(1000));
    const second = renderHook(() => useNow(1000));
    expect(vi.getTimerCount()).toBe(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });
    expect(first.result.current).toBe(second.result.current);

    first.unmount();
    second.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('is fresh when a component subscribes after an idle period', () => {
    const early = renderHook(() => useNow(1000));
    early.unmount();

    vi.setSystemTime(START + 60_000);
    const late = renderHook(() => useNow(1000));
    expect(late.result.current).toBe(START + 60_000);
  });
});
