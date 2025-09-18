import { describe, it, expect } from 'vitest';
import { validateFile, FILE_VALIDATION } from '../src/lib/file';

// Mock File constructor for testing
const createMockFile = (options: {
  name: string;
  type: string;
  size: number;
}): File => {
  const file = new File(['content'], options.name, { 
    type: options.type 
  });
  
  // Override size since File constructor doesn't let us set it directly
  Object.defineProperty(file, 'size', {
    value: options.size,
    writable: false
  });
  
  return file;
};

describe('validateFile', () => {
  it('accepts valid PDF files', () => {
    const file = createMockFile({
      name: 'document.pdf',
      type: 'application/pdf',
      size: 1024 * 1024 // 1MB
    });
    
    const result = validateFile(file);
    expect(result.isValid).toBe(true);
    expect(result.error).toBeUndefined();
  });

  it('rejects files that are too large', () => {
    const file = createMockFile({
      name: 'large-document.pdf',
      type: 'application/pdf',
      size: FILE_VALIDATION.MAX_SIZE + 1
    });
    
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('File too large');
  });

  it('rejects non-PDF MIME types', () => {
    const file = createMockFile({
      name: 'document.txt',
      type: 'text/plain',
      size: 1024
    });
    
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Only PDF files are supported');
  });

  it('rejects non-PDF file extensions', () => {
    const file = createMockFile({
      name: 'document.txt',
      type: 'application/pdf', // MIME type is correct
      size: 1024
    });
    
    const result = validateFile(file);
    expect(result.isValid).toBe(false);
    expect(result.error).toContain('Only PDF files are supported');
  });

  it('accepts PDF files with correct extension regardless of case', () => {
    const file = createMockFile({
      name: 'Document.PDF',
      type: 'application/pdf',
      size: 1024
    });
    
    const result = validateFile(file);
    expect(result.isValid).toBe(true);
  });

  it('handles files at the size limit', () => {
    const file = createMockFile({
      name: 'max-size.pdf',
      type: 'application/pdf',
      size: FILE_VALIDATION.MAX_SIZE
    });
    
    const result = validateFile(file);
    expect(result.isValid).toBe(true);
  });
});