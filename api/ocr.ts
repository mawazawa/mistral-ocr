/*
 ██████╗  █████╗ ██╗    ███████╗    ██████╗  ██████╗ ██████╗
██╔════╝ ██╔══██╗╚═╝    ██╔════╝    ██╔══██╗██╔═══██╗██╔══██╗
██║  ███╗███████║██╗    ███████╗    ██████╔╝██║   ██║██████╔╝
██║   ██║██╔══██║██║    ╚════██║    ██╔══██╗██║   ██║██╔══██╗
╚██████╔╝██║  ██║██║    ███████║    ██████╔╝╚██████╔╝██║  ██║
 ╚═════╝ ╚═╝  ╚═╝╚═╝    ╚══════╝    ╚═════╝  ╚═════╝ ╚═╝  ╚═╝

  FILE: api/ocr.ts
*/
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Mistral } from '@mistralai/mistralai';
import { z } from 'zod';

// Note: Request body validation is handled by OcrRequestSchema below

/**
 * Initializes and returns a Mistral AI client.
 *
 * @returns {Mistral} An instance of the Mistral client.
 * @throws {Error} If the MISTRAL_API_KEY environment variable is not set.
 */
const getClient = () => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('Missing MISTRAL_API_KEY environment variable.');
  }
  return new Mistral({ apiKey });
};

/**
 * Trims a string and returns undefined if it's empty.
 *
 * @param {string | null | undefined} value - The string to normalize.
 * @returns {string | undefined} The trimmed string or undefined.
 */
export const normalizeText = (value?: string | null) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

// Validation schema and limits
// Use a binary 4.5 MiB default to match frontend validation exactly
const getMaxUploadBytes = () => {
  const fromEnv = process.env.MAX_UPLOAD_BYTES;
  return fromEnv ? Number(fromEnv) : Math.round(4.5 * 1024 * 1024);
};

const OcrRequestSchema = z.object({
  fileBase64: z.string().min(1, 'fileBase64 is required.'),
  fileName: z.string().trim().default('document.pdf'),
  includeImageBase64: z.boolean().optional().default(false),
  pages: z.array(z.number().int().positive()).optional(),
  query: z
    .union([z.string(), z.null(), z.undefined()])
    .transform((v) => normalizeText(typeof v === 'string' ? v : undefined))
    .optional(),
});

const sendError = (
  res: VercelResponse,
  status: number,
  code: string,
  message: string,
  details?: unknown,
) => res.status(status).json({ error: { code, message, details } });

/**
 * Handles the OCR processing request.
 *
 * This function serves as a Vercel serverless function that processes a PDF file for OCR.
 * It takes a base64-encoded file, uploads it to Mistral AI, performs OCR, and can
 * optionally answer a question about the document.
 *
 * @param {VercelRequest} req - The Vercel request object.
 * @param {VercelResponse} res - The Vercel response object.
 * @returns {Promise<void>} A promise that resolves when the response has been sent.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return sendError(res, 405, 'METHOD_NOT_ALLOWED', 'Method Not Allowed');
  }

  try {
    const parsed = OcrRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(res, 400, 'INVALID_REQUEST', 'Invalid request body.', parsed.error.flatten());
    }

    const { fileBase64, fileName, includeImageBase64, pages, query } = parsed.data;

    const client = getClient();
    const fileBuffer = Buffer.from(fileBase64, 'base64');
    const maxUploadBytes = getMaxUploadBytes();

    if (fileBuffer.length > maxUploadBytes) {
      const maxMb = maxUploadBytes / (1024 * 1024);
      const maxMbText = Number.isInteger(maxMb) ? String(maxMb) : maxMb.toFixed(1);
      return sendError(
        res,
        413,
        'PAYLOAD_TOO_LARGE',
        `File too large. Max ${maxMbText}MB allowed.`,
        { size: fileBuffer.length },
      );
    }

    const upload = await client.files.upload({
      file: {
        fileName,
        content: fileBuffer,
      },
      purpose: 'ocr',
    });

    const signedUrl = await client.files.getSignedUrl({ fileId: upload.id });
    const documentUrl = signedUrl.url;

    const model = process.env.MISTRAL_OCR_MODEL ?? 'mistral-ocr-latest';
    const qaModel = process.env.MISTRAL_QA_MODEL ?? 'mistral-small-latest';

    const ocrResponse = await client.ocr.process({
      model,
      document: {
        type: 'document_url',
        documentUrl,
      },
      includeImageBase64: includeImageBase64,
      pages,
    });

    let answer: string | undefined;

    if (query) {
      const chatResponse = await client.chat.complete({
        model: qaModel,
        temperature: 0.2,
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: query },
              { type: 'document_url', documentUrl },
            ],
          },
        ],
      });

      const choice = chatResponse.choices?.[0];
      const messageContent = choice?.message?.content;
      if (Array.isArray(messageContent)) {
        const textPart = messageContent.find((part) => part.type === 'text');
        if (textPart && 'text' in textPart) {
          answer = textPart.text;
        }
      } else if (typeof messageContent === 'string') {
        answer = messageContent;
      }
    }

    return res.status(200).json({
      documentUrl,
      ocr: ocrResponse,
      answer,
      model,
      qaModel: query ? qaModel : undefined,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return sendError(res, 500, 'INTERNAL_SERVER_ERROR', message);
  }
}
