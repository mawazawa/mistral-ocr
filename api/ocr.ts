import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Mistral } from '@mistralai/mistralai';

interface OcrRequestPayload {
  fileBase64?: string;
  fileName?: string;
  includeImageBase64?: boolean;
  pages?: number[];
  query?: string;
}

const getClient = () => {
  const apiKey = process.env.MISTRAL_API_KEY;
  if (!apiKey) {
    throw new Error('Missing MISTRAL_API_KEY environment variable.');
  }
  return new Mistral({ apiKey });
};

export const normalizeText = (value?: string | null) => {
  if (typeof value !== 'string') {
    return undefined;
  }
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
};

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
