# Mistral Document AI OCR Playground

A Vite + React application that demonstrates how to extract structured information from complex PDFs with [Mistral Document AI OCR](https://docs.mistral.ai/guides/document_ai/basic_ocr/) and optionally run document-grounded question answering. The UI lets you upload a PDF, pick page ranges, request inline images, and submit follow-up questions. All requests are proxied through a serverless API route so the Mistral API key stays on the server side.

## Features
- Upload local PDF files and select specific pages for processing
- Calls `ocr.process` with the `mistral-ocr-latest` model and displays structured text blocks
- Optional Document Q&A follow-up powered by `chat.complete` with the `mistral-small-latest` model
- Serverless function (`api/ocr.ts`) handles file upload, signed URL generation, OCR invocation, and question answering
- Ready for Vercel deployment and local development with `vercel dev`

## Prerequisites
- Node.js 20+
- npm 10+
- A Mistral API key with access to the Document AI beta
- (For deployment) Logged in to the Vercel CLI and GitHub CLI

## Getting Started

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Configure environment variables**
   ```bash
   cp .env.example .env.local
   # edit .env.local with your keys and preferences
   ```

   | Variable | Purpose |
   | --- | --- |
   | `MISTRAL_API_KEY` | Server-side key used by the API route |
   | `MISTRAL_OCR_MODEL` | Override the OCR model (defaults to `mistral-ocr-latest`) |
   | `MISTRAL_QA_MODEL` | Override the Q&A model (defaults to `mistral-small-latest`) |
   | `VITE_API_BASE_URL` | Optional base URL for the frontend to reach the API (set to `http://localhost:3000` when using `vercel dev`) |

3. **Run locally**
   ```bash
   # Option A: run Vite only (API requests must point to a deployed endpoint)
   npm run dev

   # Option B: run the full stack locally
   npx vercel dev
   # Vercel will start on http://localhost:3000 and expose /api/ocr alongside the Vite frontend
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

## How It Works
1. The frontend converts the selected PDF to base64, parses optional page ranges, and sends the payload to `/api/ocr`.
2. The serverless handler uploads the document via `client.files.upload`, requests a signed URL, and calls `client.ocr.process` using the structured OCR output format.
3. If a question is supplied, the handler invokes `client.chat.complete` with a `document_url` content block that points to the signed PDF, returning the grounded answer.
4. The UI displays the OCR blocks per page (capped at 50 blocks per page for readability) and the optional answer.

## Deployment
1. **Create the GitHub repository**
   ```bash
   gh repo create mistral-ocr --public --source . --remote origin --push
   ```
2. **Deploy to Vercel**
   ```bash
   vercel --prod
   ```

   - Project name: `mistral-ocr`
   - Framework preset: `Vite`
   - Environment variables: copy the values from `.env.local`

Vercel automatically builds the Vite frontend and the serverless API route. Subsequent pushes to the `main` branch will trigger redeploys.

## Useful References
- [Mistral Document AI – Basic OCR Guide](https://docs.mistral.ai/guides/document_ai/basic_ocr/)
- [Mistral Document AI – Document Q&A Guide](https://docs.mistral.ai/guides/document_ai/document_qa/)
- [Mistral JS/TS SDK Reference](https://docs.mistral.ai/api/)
