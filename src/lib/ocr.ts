import type { OcrBlock, OcrPage } from '../types/mistral';

/**
 * Represents a processed page, ready for display.
 */
export interface DisplayPage {
  /** The page number, normalized to be 1-based. */
  pageNumber: number;
  /** An array of text blocks found on the page. */
  blocks: OcrBlock[];
  /** The full text of the page in Markdown format. */
  markdown: string;
}

/**
 * Normalizes the page number from an OcrPage object.
 * It prioritizes `pageNumber`, falls back to `index` (adjusting to be 1-based),
 * and finally uses the array index as a last resort.
 * @param {OcrPage} page - The OCR page object from the API.
 * @param {number} index - The array index of the page, used as a fallback.
 * @returns {number} The normalized, 1-based page number.
 */
const normalizePageNumber = (page: OcrPage, index: number): number => {
  if (typeof page.pageNumber === 'number' && Number.isFinite(page.pageNumber)) {
    return page.pageNumber;
  }
  // `page.index` is 0-based, so convert to 1-based for display.
  if (typeof page.index === 'number' && Number.isFinite(page.index)) {
    return page.index + 1;
  }
  // Fallback to the array index (also 0-based).
  return index + 1;
};

/**
 * Filters an array of OcrBlock objects, removing any null or undefined entries.
 * This ensures that the data is clean before rendering.
 * @param {OcrBlock[]} [blocks] - The array of blocks to sanitize.
 * @returns {OcrBlock[]} A new array containing only valid OcrBlock objects.
 */
const sanitizeBlocks = (blocks?: OcrBlock[]): OcrBlock[] => {
  if (!Array.isArray(blocks)) {
    return [];
  }
  return blocks.filter((block): block is OcrBlock => Boolean(block));
};

/**
 * Transforms an array of OcrPage objects from the API into a more
 * display-friendly format (DisplayPage[]).
 * @param {OcrPage[]} [pages] - The array of pages from the Mistral OCR response.
 * @returns {DisplayPage[]} An array of processed pages ready for the UI.
 */
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
