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
});
