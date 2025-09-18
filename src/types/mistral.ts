/**
 * Represents the bounding box coordinates of an element on a page.
 */
export interface BoundingBox {
  /**
   * The x-coordinate of the top-left corner.
   */
  x0?: number;
  /**
   * The y-coordinate of the top-left corner.
   */
  y0?: number;
  /**
   * The x-coordinate of the bottom-right corner.
   */
  x1?: number;
  /**
   * The y-coordinate of the bottom-right corner.
   */
  y1?: number;
}

/**
 * Represents a block of content identified by OCR, such as a line, paragraph, or table cell.
 */
export interface OcrBlock {
  /**
   * A unique identifier for the block.
   */
  id?: string;
  /**
   * The type of the block (e.g., 'line', 'paragraph', 'table').
   */
  type?: string;
  /**
   * The text content of the block.
   */
  text?: string;
  /**
   * A label associated with the block, often used for key-value pairs.
   */
  label?: string;
  /**
   * The value associated with a label, used for key-value pairs.
   */
  value?: string;
  /**
   * The confidence score of the OCR result for this block.
   */
  confidence?: number;
  /**
   * The bounding box of the block.
   */
  boundingBox?: BoundingBox;
  /**
   * Any nested child blocks.
   */
  children?: OcrBlock[];
  /**
   * For table blocks, the rows of cells.
   */
  rows?: OcrBlock[][];
}

/**
 * Represents a single page from the OCR result.
 */
export interface OcrPage {
  /**
   * The page number, starting from 1.
   */
  pageNumber?: number;
  /**
   * Zero-based index of the page in the original document.
   */
  index?: number;
  /**
   * The width of the page in pixels.
   */
  width?: number;
  /**
   * The height of the page in pixels.
   */
  height?: number;
  /**
   * Markdown fallback representation, provided when no structured blocks exist.
   */
  markdown?: string;
  /**
   * An array of text blocks found on the page.
   */
  textBlocks?: OcrBlock[];
  /**
   * An array of table blocks found on the page.
   */
  tables?: OcrBlock[];
  /**
   * An array of key-value pair blocks found on the page.
   */
  keyValues?: OcrBlock[];
}

/**
 * Represents the structured result from the OCR process.
 */
export interface OcrResult {
  /**
   * An array of pages containing the OCR data.
   */
  pages?: OcrPage[];
  /**
   * The raw, unprocessed result from the OCR engine.
   */
  raw?: unknown;
}

/**
 * Represents the full payload returned by the backend API.
 */
export interface OcrResponsePayload {
  /**
   * The temporary signed URL of the processed document.
   */
  documentUrl?: string;
  /**
   * The structured OCR result.
   */
  ocr?: {
    pages?: OcrPage[];
    [key: string]: unknown;
  };
  /**
   * The answer to the user's question, if provided.
   */
  answer?: string;
  /**
   * The name of the OCR model used.
   */
  model?: string;
  /**
   * The name of the question-answering model used, if a question was asked.
   */
  qaModel?: string;
}
