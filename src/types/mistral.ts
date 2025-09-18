export interface BoundingBox {
  x0?: number;
  y0?: number;
  x1?: number;
  y1?: number;
}

export interface OcrBlock {
  id?: string;
  type?: string;
  text?: string;
  label?: string;
  value?: string;
  confidence?: number;
  boundingBox?: BoundingBox;
  children?: OcrBlock[];
  rows?: OcrBlock[][];
}

export interface OcrPage {
  pageNumber?: number;
  index?: number;
  width?: number;
  height?: number;
  markdown?: string;
  textBlocks?: OcrBlock[];
  tables?: OcrBlock[];
  keyValues?: OcrBlock[];
}

export interface OcrResult {
  pages?: OcrPage[];
  raw?: unknown;
}

export interface OcrResponsePayload {
  documentUrl?: string;
  ocr?: {
    pages?: OcrPage[];
    [key: string]: unknown;
  };
  answer?: string;
  model?: string;
  qaModel?: string;
}
