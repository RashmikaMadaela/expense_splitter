import { describe, it, expect } from 'vitest';
import {
  parseAmountToMinor,
  parsePercentToBp,
  bpToPercentString,
  minorToRupeeString,
  formatMinor,
  MAX_AMOUNT_MINOR,
} from '../money';

describe('parseAmountToMinor', () => {
  it('parses whole and decimal amounts exactly', () => {
    expect(parseAmountToMinor('12000').minor).toBe(1_200_000);
    expect(parseAmountToMinor('3333.34').minor).toBe(333_334);
    expect(parseAmountToMinor('0.29').minor).toBe(29);
    expect(parseAmountToMinor('1234567.89').minor).toBe(123_456_789);
  });

  it('is exact where float rounding is not', () => {
    // Math.round(2.675 * 100) === 267, because 2.675 * 100 is 267.4999...
    expect(parseAmountToMinor('2.675').ok).toBe(false);
    expect(parseAmountToMinor('2.67').minor).toBe(267);
    expect(parseAmountToMinor('2.68').minor).toBe(268);
  });

  it('rejects more than 2 decimal places rather than silently rounding', () => {
    for (const input of ['3333.335', '0.006', '100.999']) {
      const result = parseAmountToMinor(input);
      expect(result.ok).toBe(false);
      expect(result.error).toMatch(/2 decimal places/);
    }
  });

  it('rejects non-numeric and empty input', () => {
    for (const input of ['', '  ', 'abc', '1.2.3', '12a', '1e5']) {
      expect(parseAmountToMinor(input).ok).toBe(false);
    }
  });

  it('rejects amounts beyond the supported ceiling', () => {
    expect(parseAmountToMinor(String(MAX_AMOUNT_MINOR / 100 + 1)).ok).toBe(false);
  });

  it('handles a single decimal place', () => {
    expect(parseAmountToMinor('5.5').minor).toBe(550);
  });
});

describe('parsePercentToBp', () => {
  it('parses percentages into basis points exactly', () => {
    expect(parsePercentToBp('100').minor).toBe(10_000);
    expect(parsePercentToBp('33.33').minor).toBe(3333);
    expect(parsePercentToBp('33.34').minor).toBe(3334);
    expect(parsePercentToBp('0').minor).toBe(0);
  });

  it('makes 33.33 + 33.33 + 33.34 sum to exactly 100%', () => {
    const sum =
      parsePercentToBp('33.33').minor! +
      parsePercentToBp('33.33').minor! +
      parsePercentToBp('33.34').minor!;
    expect(sum).toBe(10_000);
  });

  it('rejects more than 2 decimal places', () => {
    expect(parsePercentToBp('33.333').ok).toBe(false);
  });

  it('rejects negative and malformed percentages', () => {
    for (const input of ['-5', 'abc', '', '1.2.3']) {
      expect(parsePercentToBp(input).ok).toBe(false);
    }
  });
});

describe('formatting', () => {
  it('round-trips minor units to a rupee string', () => {
    expect(minorToRupeeString(333_334)).toBe('3333.34');
    expect(minorToRupeeString(29)).toBe('0.29');
    expect(minorToRupeeString(-500)).toBe('-5.00');
  });

  it('formats display amounts with separators and 2 decimals', () => {
    expect(formatMinor(1_200_000)).toBe('Rs. 12,000.00');
    expect(formatMinor(333_334)).toBe('Rs. 3,333.34');
    expect(formatMinor(-933_333)).toBe('-Rs. 9,333.33');
    expect(formatMinor(0)).toBe('Rs. 0.00');
  });

  it('formats basis points back to a percentage string', () => {
    expect(bpToPercentString(3333)).toBe('33.33');
    expect(bpToPercentString(10_000)).toBe('100.00');
  });
});
