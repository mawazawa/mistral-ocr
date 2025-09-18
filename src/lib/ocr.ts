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
  if (typeof page.index === 'number' && Number.isFinite(page.index)) {
    return page.index + 1;
  }
  return index + 1;
};

const sanitizeBlocks = (blocks?: OcrBlock[]): OcrBlock[] => {
  if (!Array.isArray(blocks)) {
    return [];
  }
  return blocks.filter((block): block is OcrBlock => Boolean(block));
};

/**
 * Converts a set of OCR text blocks into a simple markdown string.
 * This is a best-effort fallback when the OCR engine does not provide markdown.
 */
const blocksToMarkdown = (blocks: OcrBlock[]): string => {
  const parts: string[] = [];
  for (const block of blocks) {
    const text = block.text?.trim();
    if (!text) continue;
    // Light formatting hints based on block type
    const type = (block.type ?? '').toLowerCase();
    if (type.includes('title') || type.includes('header') || type.includes('heading')) {
      parts.push(`# ${text}`);
      continue;
    }
    // Key/value pairs
    if (block.label && block.value) {
      parts.push(`- **${block.label.trim()}**: ${block.value.trim()}`);
      continue;
    }
    parts.push(text);
  }

  // Separate paragraphs with blank lines
  return parts.join('\n\n').trim();
};

export const prepareDisplayPages = (pages?: OcrPage[]): DisplayPage[] => {
  if (!Array.isArray(pages)) {
    return [];
  }

  return pages.map((page, index) => {
    const blocks = sanitizeBlocks(page.textBlocks);
    const markdownFromEngine = typeof page.markdown === 'string' ? page.markdown.trim() : '';
    const markdown = markdownFromEngine || (blocks.length ? blocksToMarkdown(blocks) : '');

    return {
      pageNumber: normalizePageNumber(page, index),
      blocks,
      markdown,
    };
  });
};
