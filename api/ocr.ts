import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Mistral } from '@mistralai/mistralai';

/**
 * Defines the expected shape of the request body for the OCR endpoint.
 */
interface OcrRequestPayload {
  /** Base64-encoded content of the file to process. */
  fileBase64?: string;
  /** The name of the file. Defaults to 'document.pdf' if not provided. */
  fileName?: string;
  /** Whether to include base64-encoded images of the pages in the response. */
  includeImageBase64?: boolean;
  /** An array of page numbers to process. If not provided, all pages are processed. */
  pages?: number[];
  /** An optional question to ask about the document content. */
  query?: string;
}

/**
 * Initializes and returns a Mistral AI client.
 * It requires the MISTRAL_API_KEY environment variable to be set.
 * @throws {Error} if the MISTRAL_API_KEY is not set.
 */
const getClient = () => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('Missing MISTRAL_API_KEY environment variable.');
  }
  return new Mistral({ apiKey });
};

/**
 * Trims a string and returns undefined if it's empty or not a string.
 * This is useful for normalizing optional text inputs.
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
 * Vercel serverless function to handle OCR processing.
 * It takes a file, performs OCR on it using the Mistral API,
 * and can optionally answer a question about the document's content.
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Ensure the request method is POST.
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const body = req.body as OcrRequestPayload | undefined;
    if (!body?.fileBase64) {
      return res.status(400).json({ error: 'fileBase64 is required.' });
    }

    // Prepare parameters for the API call.
    const fileName = body.fileName ?? 'document.pdf';
    const includeImages = Boolean(body.includeImageBase64);
    const query = normalizeText(body.query);

    const client = getClient();
    const fileBuffer = Buffer.from(body.fileBase64, 'base64');

    // Step 1: Upload the file to Mistral's file service.
    // The file is uploaded with the 'ocr' purpose.
    const upload = await client.files.upload({
      file: {
        fileName,
        content: fileBuffer,
      },
      purpose: 'ocr',
    });

    // Step 2: Get a signed URL for the uploaded file.
    // This URL is used to reference the document in the OCR call.
    const signedUrl = await client.files.getSignedUrl({ fileId: upload.id });
    const documentUrl = signedUrl.url;

    // Determine which models to use, with fallbacks to the latest versions.
    const model = process.env.MISTRAL_OCR_MODEL ?? 'mistral-ocr-latest';
    const qaModel = process.env.MISTRAL_QA_MODEL ?? 'mistral-small-latest';

    // Step 3: Perform OCR on the document.
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

    // Step 4 (Optional): If a query is provided, ask a question about the document.
    if (query) {
      const chatResponse = await client.chat.complete({
        model: qaModel,
        temperature: 0.2, // Low temperature for more deterministic answers.
        messages: [
          {
            role: 'user',
            content: [
              { type: 'text', text: query },
              { type: 'document_url', documentUrl }, // Reference the document in the query.
            ],
          },
        ],
      });

      // Extract the text content from the response.
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

    // Step 5: Return the successful response.
    return res.status(200).json({
      documentUrl,
      ocr: ocrResponse,
      answer,
      model,
      qaModel: query ? qaModel : undefined,
    });
  } catch (error) {
    // Handle any errors that occur during the process.
    const message = error instanceof Error ? error.message : 'Unexpected server error.';
    return res.status(500).json({ error: message });
  }
}
