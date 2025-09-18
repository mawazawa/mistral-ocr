import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import handler, { normalizeText } from '../api/ocr';
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Mistral } from '@mistralai/mistralai';

vi.mock('@mistralai/mistralai');

const mockClient = {
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

const createRequest = (body: unknown, method: string = 'POST') =>
  ({ method, body } as unknown as VercelRequest);

const createResponse = () => {
  const res: Partial<VercelResponse> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.setHeader = vi.fn().mockReturnValue(res);
  return res as VercelResponse;
};

let originalKey: string | undefined;

beforeEach(() => {
  vi.clearAllMocks();
  (Mistral as unknown as vi.Mock).mockReturnValue(mockClient);
  originalKey = process.env.MISTRAL_API_KEY;
});

afterEach(() => {
  process.env.MISTRAL_API_KEY = originalKey;
});

describe('normalizeText', () => {
  it('trims whitespace and drops empty strings', () => {
    expect(normalizeText('  hello  ')).toBe('hello');
    expect(normalizeText('   ')).toBeUndefined();
    expect(normalizeText(undefined)).toBeUndefined();
  });
});

describe('OCR handler', () => {
  it('rejects non-POST requests', async () => {
    const req = createRequest({}, 'GET');
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(405);
    expect(res.json).toHaveBeenCalledWith({ error: 'Method Not Allowed' });
  });

  it('validates presence of fileBase64', async () => {
    const req = createRequest({});
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ error: 'fileBase64 is required.' });
  });

  it('fails when API key is missing', async () => {
    delete process.env.MISTRAL_API_KEY;
    const req = createRequest({ fileBase64: 'dGVzdA==' });
    const res = createResponse();

    await handler(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing MISTRAL_API_KEY environment variable.' });
  });

  it('returns OCR payload when processing succeeds', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    mockClient.files.upload.mockResolvedValue({ id: 'file-id' });
    mockClient.files.getSignedUrl.mockResolvedValue({ url: 'signed-url' });
    mockClient.ocr.process.mockResolvedValue({ text: 'ocr-text' });

    const req = createRequest({ fileBase64: 'dGVzdA==' });
    const res = createResponse();

    await handler(req, res);

    expect(mockClient.files.upload).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ documentUrl: 'signed-url', ocr: { text: 'ocr-text' } }),
    );
  });

  it('adds answer when query is provided', async () => {
    process.env.MISTRAL_API_KEY = 'test-key';
    mockClient.files.upload.mockResolvedValue({ id: 'file-id' });
    mockClient.files.getSignedUrl.mockResolvedValue({ url: 'signed-url' });
    mockClient.ocr.process.mockResolvedValue({ text: 'ocr-text' });
    mockClient.chat.complete.mockResolvedValue({
      choices: [{ message: { content: 'qa-answer' } }],
    });

    const req = createRequest({ fileBase64: 'dGVzdA==', query: 'What is this?' });
    const res = createResponse();

    await handler(req, res);

    expect(mockClient.chat.complete).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ answer: 'qa-answer' }));
  });
});
