import { describe, expect, it } from 'vitest';
import { prepareDisplayPages } from '../src/lib/ocr';

describe('prepareDisplayPages', () => {
  it('falls back to markdown when no structured blocks exist', () => {
    const pages = prepareDisplayPages([
      {
        index: 0,
        markdown: 'Summary paragraph.',
      },
    ]);

    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({
      pageNumber: 1,
      markdown: 'Summary paragraph.',
    });
    expect(pages[0].blocks).toEqual([]);
  });

  it('prefers the 1-based page index from the API', () => {
    const pages = prepareDisplayPages([
      {
        index: 1,
        markdown: 'Page 1 content.',
      },
      {
        index: 2,
        markdown: 'Page 2 content.',
      },
    ]);

    expect(pages).toHaveLength(2);
    expect(pages[0].pageNumber).toBe(1);
    expect(pages[1].pageNumber).toBe(2);
  });
});
