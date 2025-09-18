import { describe, it, expect, vi, beforeEach } from 'vitest';
import { normalizeText } from './ocr';
import handler from './ocr';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Mistral } from '@mistralai/mistralai';

vi.mock('@mistralai/mistralai');

const mockMistralClient = {
  files: {
    upload: vi.fn(),
    getSignedUrl: vi.fn(),
  },
  ocr: {
    process: vi.fn(),
  },
  chat: {
    complete: vi.fn(),
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  (Mistral as vi.Mock).mockReturnValue(mockMistralClient);
});

describe('normalizeText', () => {
  it('should return undefined for null or undefined values', () => {
    expect(normalizeText(null)).toBeUndefined();
    expect(normalizeText(undefined)).toBeUndefined();
  });

  it('should trim leading and trailing whitespace', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
  });

  it('should return the string if there is no whitespace to trim', () => {
    expect(normalizeText('hello')).toBe('hello');
  });

  it('should return undefined for empty or whitespace-only strings', () => {
    expect(normalizeText('')).toBeUndefined();
    expect(normalizeText('   ')).toBeUndefined();
  });
});

describe('OCR API handler', () => {
  const mockRequest = (body: any, method = 'POST') => ({
    method,
    body,
  } as unknown as VercelRequest);

  const mockResponse = () => {
    const res: Partial<VercelResponse> = {};
    res.status = vi.fn().mockReturnValue(res);
    res.json = vi.fn().mockReturnValue(res);
    res.setHeader = vi.fn().mockReturnValue(res);
    return res as VercelResponse;
  };

  it('should return 405 if method is not POST', async () => {
    const req = mockRequest({}, 'GET');
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  it('should return 400 if fileBase64 is missing', async () => {
    const req = mockRequest({});
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'fileBase64 is required.' });
  });

  it('should throw an error if MISTRAL_API_KEY is not set', async () => {
    delete process.env.MISTRAL_API_KEY;
    const req = mockRequest({ fileBase64: 'dGVzdA==' });
    const res = mockResponse();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing MISTRAL_API_KEY environment variable.' });
  });

  it('should process the file and return OCR data', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    mockMistralClient.files.upload.mockResolvedValue({ id: 'file-id' });
    mockMistralClient.files.getSignedUrl.mockResolvedValue({ url: 'signed-url' });
    mockMistralClient.ocr.process.mockResolvedValue({ text: 'ocr-text' });

    const req = mockRequest({ fileBase64: 'dGVzdA==' });
    const res = mockResponse();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      documentUrl: 'signed-url',
      ocr: { text: 'ocr-text' },
    }));
  });

  it('should perform Q&A if a query is provided', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    mockMistralClient.files.upload.mockResolvedValue({ id: 'file-id' });
    mockMistralClient.files.getSignedUrl.mockResolvedValue({ url: 'signed-url' });
    mockMistralClient.ocr.process.mockResolvedValue({ text: 'ocr-text' });
    mockMistralClient.chat.complete.mockResolvedValue({
      choices: [{ message: { content: 'qa-answer' } }],
    });

    const req = mockRequest({ fileBase64: 'dGVzdA==', query: 'What is this?' });
    const res = mockResponse();
    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      answer: 'qa-answer',
    }));
  });
});
