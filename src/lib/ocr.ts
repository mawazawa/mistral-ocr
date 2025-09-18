import type { OcrBlock, OcrPage } from '../types/mistral';

export interface DisplayPage {
  pageNumber: number;
  blocks: OcrBlock[];
  markdown: string;
}

const normalizePageNumber = (page: OcrPage, index: number): number => {
  if (typeof page.pageNumber === 'number' && Number.isFinite(page.pageNumber)) {
    return page.pageNumber;
  }
  if (typeof page.index === 'number' && Number.isFinite(page.index) && page.index > 0) {
    return page.index;
  }
  return index + 1;
};

const sanitizeBlocks = (blocks?: OcrBlock[]): OcrBlock[] => {
  if (!Array.isArray(blocks)) {
    return [];
  }
  return blocks.filter((block): block is OcrBlock => Boolean(block));
};

export const prepareDisplayPages = (pages?: OcrPage[]): DisplayPage[] => {
  if (!Array.isArray(pages)) {
    return [];
  }

  return pages.map((page, index) => {
    const blocks = sanitizeBlocks(page.textBlocks);
    const markdown = typeof page.markdown === 'string' ? page.markdown.trim() : '';

    return {
      pageNumber: normalizePageNumber(page, index),
      blocks,
      markdown,
    };
  });
};
