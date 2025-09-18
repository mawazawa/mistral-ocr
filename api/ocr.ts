import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Mistral } from '@mistralai/mistralai';

/**
 * Defines the expected shape of the request body for the OCR endpoint.
 */
interface OcrRequestPayload {
  /**
   * The base64-encoded string of the PDF file.
   */
  fileBase64?: string;
  /**
   * The name of the file. Defaults to 'document.pdf'.
   */
  fileName?: string;
  /**
   * Whether to include base64-encoded images of the pages in the response.
   */
  includeImageBase64?: boolean;
  /**
   * An array of page numbers to process. Processes all pages if undefined.
   */
  pages?: number[];
  /**
   * An optional question to ask about the document.
   */
  query?: string;
}

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
const normalizeText = (value?: string | null) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

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
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body as OcrRequestPayload | undefined;
    if (!body?.fileBase64) {
      return res.status(400).json({ error: 'fileBase64 is required.' });
    }

    const fileName = body.fileName ?? 'document.pdf';
    const includeImages = Boolean(body.includeImageBase64);
    const query = normalizeText(body.query);

    const client = getClient();
    const fileBuffer = Buffer.from(body.fileBase64, 'base64');

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
      includeImageBase64: includeImages,
      pages: body.pages,
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
    return res.status(500).json({ error: message });
  }
}
