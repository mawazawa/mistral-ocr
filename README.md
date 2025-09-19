# Mistral Document AI OCR Playground

This repository contains a fully-documented Vite + React application that serves as a playground for the [Mistral Document AI OCR](https://docs.mistral.ai/guides/document_ai/basic_ocr/).

## Project Purpose

The primary goal of this project is to provide a clear, well-documented example of how to build a full-stack application that interacts with Mistral's Document AI services. It demonstrates best practices for:

- **Frontend Development**: Building a responsive user interface with React and Vite.
- **Backend Development**: Creating a secure serverless backend with Vercel Functions to handle API requests.
- **API Integration**: Securely calling the Mistral AI API from a server-side environment.
- **Code Documentation**: Following JSDoc standards to ensure the codebase is easy to understand and maintain.

It allows users to upload a PDF, extract structured information, and perform question-answering tasks on the document content.

## Features

- **PDF Upload**: Upload local PDF files for analysis with drag-and-drop support.
- **File Validation**: Frontend validation for file type, size, and format.
- **Page Selection**: Specify particular pages or page ranges for processing.
- **Structured OCR**: Calls `ocr.process` to extract text, tables, and other structured data.
- **Document Q&A**: Optionally ask questions about the document using a chat model.
- **Progress Indicators**: Real-time progress tracking during file processing.
- **Enhanced UX**: Improved error messages and user feedback.
- **Secure API Calls**: Proxies all Mistral API requests through a serverless backend to protect the API key.
- **CI/CD Ready**: GitHub Actions workflow for automated testing and deployment.
- **Vercel-Ready**: Designed for easy deployment on Vercel.

## Codebase Overview

The repository is structured to separate frontend and backend concerns:

- **`api/ocr.ts`**: A Vercel serverless function that acts as the backend. It receives requests from the frontend, securely calls the Mistral API, and returns the results.
- **`src/`**: The main directory for the React frontend application.
  - **`src/App.tsx`**: The core React component that renders the UI and manages application state.
  - **`src/lib/file.ts`**: Contains utility functions for file handling, such as reading a file as a base64 string.
  - **`src/types/mistral.ts`**: Defines TypeScript interfaces for the data structures used throughout the application, primarily for the Mistral API response.
- **`public/`**: Static assets for the Vite application.

## Documentation

All functions, classes, and type interfaces in the codebase are fully documented using JSDoc. This provides developers with clear explanations of the code's purpose, parameters, and return values, which can be easily picked up by IDEs and documentation generation tools.

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

5. **Security**
   - Do not commit real secrets. `.env` is ignored; use `.env.example` for placeholders.
   - The app enforces a 4.5 MB max upload (configurable via `MAX_UPLOAD_BYTES`).

4. **Build for production**
   ```bash
   npm run build
   ```

## How It Works
1. **File Upload**: Users can drag-and-drop or select a PDF file. The frontend validates file type and size before processing.
2. **File Processing**: The frontend converts the selected PDF to base64, parses optional page ranges, and shows progress indicators.
3. **API Processing**: The serverless handler uploads the document via `client.files.upload`, requests a signed URL, and calls `client.ocr.process` using the structured OCR output format.
4. **Q&A Processing**: If a question is supplied, the handler invokes `client.chat.complete` with a `document_url` content block that points to the signed PDF, returning the grounded answer.
5. **Results Display**: The UI displays the OCR blocks per page (capped at 50 blocks per page for readability) and the optional answer with enhanced error handling.

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
