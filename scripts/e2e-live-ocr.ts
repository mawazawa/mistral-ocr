#!/usr/bin/env ts-node
/*
  Live OCR E2E smoke test (no server required)
  - Downloads a tiny sample PDF
  - Uploads to Mistral Files API
  - Runs OCR (first page)
  - Optionally runs a small Q&A

  Requirements:
  - MISTRAL_API_KEY in environment
*/

import { Mistral } from '@mistralai/mistralai';
import assert from 'node:assert';

const SAMPLE_PDF_URL = 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf';

async function run() {
  const apiKey = process.env.MISTRAL_API_KEY;
  assert(apiKey, 'Missing MISTRAL_API_KEY in environment');

  const client = new Mistral({ apiKey });

  // Fetch sample PDF
  const response = await fetch(SAMPLE_PDF_URL);
  if (!response.ok) {
    throw new Error(`Failed to download sample PDF: ${response.status} ${response.statusText}`);
  }
  const arrayBuffer = await response.arrayBuffer();
  const fileBuffer = Buffer.from(arrayBuffer);

  // Upload file
  const upload = await client.files.upload({
    file: { fileName: 'sample.pdf', content: fileBuffer },
    purpose: 'ocr',
  });

  const { url: documentUrl } = await client.files.getSignedUrl({ fileId: upload.id });

  // OCR process: first page only for speed
  const model = process.env.MISTRAL_OCR_MODEL ?? 'mistral-ocr-latest';
  const ocr = await client.ocr.process({
    model,
    document: { type: 'document_url', documentUrl },
    pages: [1],
  });

  // Basic sanity checks
  if (!ocr || (Array.isArray((ocr as any).pages) && (ocr as any).pages.length === 0)) {
    throw new Error('OCR returned no pages');
  }

  // Optional: tiny Q&A to ensure grounding works
  const qaModel = process.env.MISTRAL_QA_MODEL ?? 'mistral-small-latest';
  const qa = await client.chat.complete({
    model: qaModel,
    temperature: 0,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: 'What is the document about briefly?' },
          { type: 'document_url', documentUrl },
        ],
      },
    ],
  });
  const answer = Array.isArray(qa.choices?.[0]?.message?.content)
    ? (qa.choices![0]!.message!.content!.find((p: any) => p.type === 'text') as any)?.text
    : qa.choices?.[0]?.message?.content;

  console.log('Live OCR E2E:');
  console.log('- Uploaded file id:', upload.id);
  console.log('- Signed URL:', documentUrl);
  console.log('- OCR pages:', (ocr as any).pages?.length ?? 'n/a');
  console.log('- QA answer:', typeof answer === 'string' ? answer.slice(0, 140) : 'n/a');

  console.log('\nOK: Live OCR E2E succeeded.');
}

run().catch((err) => {
  console.error('Live OCR E2E failed:', err?.message || err);
  process.exit(1);
});
