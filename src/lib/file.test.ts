import { describe, it, expect } from 'vitest';
import { parsePageSelection } from './file';

describe('parsePageSelection', () => {
  it('should return undefined for empty or whitespace strings', () => {
    expect(parsePageSelection('')).toBeUndefined();
    expect(parsePageSelection(' ')).toBeUndefined();
  });

  it('should parse a single page number', () => {
    expect(parsePageSelection('3')).toEqual([3]);
  });

  it('should parse a comma-separated list of page numbers', () => {
    expect(parsePageSelection('1, 3, 5')).toEqual([1, 3, 5]);
  });

  it('should parse a range of page numbers', () => {
    expect(parsePageSelection('2-5')).toEqual([2, 3, 4, 5]);
  });

  it('should parse a combination of single pages and ranges', () => {
    expect(parsePageSelection('1, 3-5, 8')).toEqual([1, 3, 4, 5, 8]);
  });

  it('should handle duplicate page numbers and sort the result', () => {
    expect(parsePageSelection('5, 1, 3-4, 1, 4')).toEqual([1, 3, 4, 5]);
  });

  it('should ignore invalid page numbers and ranges', () => {
    expect(parsePageSelection('abc, 1, def-ghi, 2')).toEqual([1, 2]);
  });

  it('should return undefined if no valid pages are found', () => {
    expect(parsePageSelection('abc, def-ghi')).toBeUndefined();
  });

  it('should ignore ranges where start is greater than end', () => {
    expect(parsePageSelection('5-2, 8')).toEqual([8]);
  });

  // Failing tests for the bug
  it('should ignore page number 0', () => {
    expect(parsePageSelection('0')).toBeUndefined();
    expect(parsePageSelection('1, 0, 2')).toEqual([1, 2]);
  });

  it('should ignore ranges starting with 0', () => {
    expect(parsePageSelection('0-2')).toBeUndefined();
    expect(parsePageSelection('0-2, 3')).toEqual([3]);
  });
});
