import { describe, expect, it } from 'vitest';
import { parsePageSelection } from '../src/lib/file';

describe('parsePageSelection', () => {
  it('returns undefined for empty or whitespace strings', () => {
    expect(parsePageSelection('')).toBeUndefined();
    expect(parsePageSelection('   ')).toBeUndefined();
  });

  it('parses single numbers and ranges', () => {
    expect(parsePageSelection('1, 3-4, 8')).toEqual([1, 3, 4, 8]);
  });

  it('ignores invalid tokens and unsorted input', () => {
    expect(parsePageSelection('5, foo, 2-3, bar-10')).toEqual([2, 3, 5]);
  });

  it('ignores ranges where the start is zero or larger than the end', () => {
    expect(parsePageSelection('0-2, 5-2, 3')).toEqual([3]);
  });

  it('ignores explicit page 0 entries', () => {
    expect(parsePageSelection('0, 1, 2')).toEqual([1, 2]);
  });

  it('returns undefined when nothing valid remains', () => {
    expect(parsePageSelection('foo, 0, 0-0')).toBeUndefined();
  });
});
