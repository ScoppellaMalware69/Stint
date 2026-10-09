import { describe, expect, it } from 'vitest';
import {
  bpsToInputValue,
  centsToInputValue,
  parseMoneyInput,
  parsePercentInput,
} from '@/lib/money';

describe('parseMoneyInput', () => {
  it.each([
    ['85', 8500],
    ['85.5', 8550],
    ['85,50', 8550],
    ['85.05', 8505],
    ['0.05', 5],
    ['0', 0],
    [' 120 ', 12_000],
    ['1 234', 123_400],
    ['1 234,5', 123_450],
    ['999999999.99', 99_999_999_999],
  ])('parses %j as %d cents', (input, expected) => {
    expect(parseMoneyInput(input)).toBe(expected);
  });

  it.each(['', '  ', 'abc', '-5', '1.234', '1,234.50', '85.555', '€85', '1234567890', '.5', '5.'])(
    'rejects %j',
    (input) => {
      expect(parseMoneyInput(input)).toBeNull();
    },
  );
});

describe('centsToInputValue', () => {
  it.each([
    [8550, '85.50'],
    [5, '0.05'],
    [0, '0.00'],
    [100_000, '1000.00'],
    [null, ''],
    [undefined, ''],
  ])('%j → %j', (cents, expected) => {
    expect(centsToInputValue(cents)).toBe(expected);
  });

  it.each([0, 1, 99, 100, 8550, 123_456])('round-trips %d cents through the input', (cents) => {
    expect(parseMoneyInput(centsToInputValue(cents))).toBe(cents);
  });
});

describe('percent inputs', () => {
  it.each([
    ['22', 2200],
    ['7.5', 750],
    ['7,5', 750],
    ['7.25', 725],
    ['0.29', 29],
    ['22%', 2200],
    ['22 %', 2200],
    ['0', 0],
    ['100', 10_000],
  ])('parsePercentInput(%j) → %d bps', (input, expected) => {
    expect(parsePercentInput(input)).toBe(expected);
  });

  it.each(['', 'abc', '-1', '100.01', '1000', '5.555', '%'])('rejects %j', (input) => {
    expect(parsePercentInput(input)).toBeNull();
  });

  it.each([
    [2200, '22'],
    [750, '7.5'],
    [725, '7.25'],
    [1, '0.01'],
    [0, '0'],
    [10_000, '100'],
  ])('bpsToInputValue(%d) → %j', (bps, expected) => {
    expect(bpsToInputValue(bps)).toBe(expected);
    expect(parsePercentInput(expected)).toBe(bps);
  });
});
