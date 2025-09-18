import { describe, it, expect } from 'vitest';
import { parsePageSelection } from './file';

describe('parsePageSelection', () => {
  it('should return undefined for empty or whitespace strings', () => {
    expect(parsePageSelection('')).toBeUndefined();
    expect(parsePageSelection('  ')).toBeUndefined();
  });

  it('should parse a single page number', () => {
    expect(parsePageSelection('3')).toEqual([3]);
  });

  it('should parse multiple page numbers', () => {
    expect(parsePageSelection('1, 5, 2')).toEqual([1, 2, 5]);
  });

  it('should handle extra whitespace', () => {
    expect(parsePageSelection(' 1 ,  5,  2 ')).toEqual([1, 2, 5]);
  });

  it('should parse a page range', () => {
    expect(parsePageSelection('3-6')).toEqual([3, 4, 5, 6]);
  });

  it('should parse multiple page ranges', () => {
    expect(parsePageSelection('3-5, 8-10')).toEqual([3, 4, 5, 8, 9, 10]);
  });

  it('should parse a mix of single pages and ranges', () => {
    expect(parsePageSelection('1, 3-5, 8')).toEqual([1, 3, 4, 5, 8]);
  });

  it('should handle duplicate page numbers gracefully', () => {
    expect(parsePageSelection('1, 1, 2, 2')).toEqual([1, 2]);
    expect(parsePageSelection('1, 1-3, 2')).toEqual([1, 2, 3]);
  });

  it('should ignore invalid page numbers', () => {
    expect(parsePageSelection('abc, 1.5, -5')).toEqual([1]);
    expect(parsePageSelection('1, abc, 2')).toEqual([1, 2]);
  });

  it('should ignore invalid ranges', () => {
    expect(parsePageSelection('5-3')).toBeUndefined();
    expect(parsePageSelection('1, 7-5, 3')).toEqual([1, 3]);
  });

  it('should return undefined if no valid pages are found', () => {
    expect(parsePageSelection('abc, def')).toBeUndefined();
  });
});
