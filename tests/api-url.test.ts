import { describe, it, expect, vi, afterEach } from 'vitest';
import { createApiUrlResolver } from '../src/lib/api';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('createApiUrlResolver', () => {
  it('returns relative path when base URL is empty', () => {
    const resolve = createApiUrlResolver(undefined);
    expect(resolve('/api/ocr')).toBe('/api/ocr');
  });

  it('falls back to relative path when base URL points to localhost but window host is different', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'mistral-ocr.vercel.app',
      },
    });

    const resolve = createApiUrlResolver('http://localhost:3000');
    expect(resolve('/api/ocr')).toBe('/api/ocr');
  });

  it('respects non-loopback configured URLs', () => {
    vi.stubGlobal('window', {
      location: {
        hostname: 'mistral-ocr.vercel.app',
      },
    });

    const resolve = createApiUrlResolver('https://api.example.com');
    expect(resolve('/api/ocr')).toBe('https://api.example.com/api/ocr');
  });
});
