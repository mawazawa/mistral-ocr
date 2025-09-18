import { useMemo, useState } from 'react';
import './App.css';
import { readFileAsBase64, parsePageSelection } from './lib/file';
import { resolveApiUrl } from './lib/api';
import { prepareDisplayPages } from './lib/ocr';
import type { OcrBlock, OcrResponsePayload } from './types/mistral';

const describeBlock = (block: OcrBlock): string => {
  if (block.label && block.value) {
    return `${block.label}: ${block.value}`;
  }
  if (block.text) {
    return block.text;
  }
  return block.type ?? 'Unknown block';
};

function App() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState('');
  const [pages, setPages] = useState('');
  const [includeImages, setIncludeImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<OcrResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files && event.target.files[0];
    setFile(nextFile ?? null);
    setResult(null);
    setError(null);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    console.log('handleSubmit: start');
    event.preventDefault();
    if (!file) {
      setError('Please choose a PDF to analyse.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);

    try {
      const base64 = await readFileAsBase64(file);
      const parsedPages = parsePageSelection(pages);
      const payload = {
        fileBase64: base64,
        fileName: file.name,
        includeImageBase64: includeImages,
        pages: parsedPages,
        query: question.trim() ? question.trim() : undefined,
      };
      console.log('handleSubmit: payload', payload);

      const response = await fetch(resolveApiUrl('/api/ocr'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || 'Unexpected error while calling OCR API.');
      }

      const data = (await response.json()) as OcrResponsePayload;
      console.log('handleSubmit: success', data);
      setResult(data);
    } catch (submissionError) {
      const message =
        submissionError instanceof Error
          ? submissionError.message
          : 'Failed to process document.';
      console.error('handleSubmit: error', message);
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayPages = useMemo(
    () => prepareDisplayPages(result?.ocr?.pages),
    [result],
  );

  return (
    <main className="app-shell">
      <section className="panel">
        <header>
          <h1>Mistral Document AI Playground</h1>
          <p>
            Upload a complex PDF and optionally ask a question. The request is proxied through
            a serverless function that calls Mistral&apos;s OCR and Document Q&amp;A endpoints, so your
            API key stays on the server.
          </p>
        </header>

        <form className="ocr-form" onSubmit={handleSubmit}>
          <label className="form-field">
            <span>PDF file</span>
            <input
              type="file"
              accept="application/pdf"
              onChange={handleFileChange}
              required
              disabled={isSubmitting}
            />
          </label>

          <label className="form-field">
            <span>Pages to include (e.g. 1, 3-4)</span>
            <input
              type="text"
              placeholder="All pages"
              value={pages}
              onChange={(event) => setPages(event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <label className="form-field">
            <span>Ask a question about the document</span>
            <textarea
              placeholder="Optional question for the Document Q&A model"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={3}
              disabled={isSubmitting}
            />
          </label>

          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={includeImages}
              onChange={(event) => setIncludeImages(event.target.checked)}
              disabled={isSubmitting}
            />
            <span>Include inline page images (base64) in the OCR response</span>
          </label>

          <button type="submit" disabled={isSubmitting || !file}>
            {isSubmitting ? 'Processing…' : 'Run OCR'}
          </button>
        </form>

        {error ? <p className="error">{error}</p> : null}
      </section>

      <section className="panel results">
        <header>
          <h2>Results</h2>
          {result?.model ? (
            <p className="meta">
              OCR model <strong>{result.model}</strong>
              {result.qaModel ? ` · Q&A model ${result.qaModel}` : ''}
            </p>
          ) : null}
          {result?.documentUrl ? (
            <p className="meta">
              Processed document stored at a temporary signed URL. Keep it secret and recycle when
              finished.
            </p>
          ) : null}
        </header>

        {result?.answer ? (
          <article className="answer">
            <h3>Answer</h3>
            <p>{result.answer}</p>
          </article>
        ) : null}

        {displayPages.length ? (
          <div className="page-grid">
            {displayPages.map((page) => (
              <article key={page.pageNumber} className="page-card">
                <h3>Page {page.pageNumber}</h3>
                {page.blocks.length ? (
                  <ul>
                    {page.blocks.slice(0, 50).map((block, index) => (
                      <li key={block.id ?? `${page.pageNumber}-${index}`}>
                        <span className="tag">{block.type ?? 'text'}</span>
                        <p>{describeBlock(block)}</p>
                      </li>
                    ))}
                  </ul>
                ) : page.markdown ? (
                  <div className="markdown-result">
                    {page.markdown
                      .split(/\n\s*\n/)
                      .map((paragraph) => paragraph.trim())
                      .filter((paragraph) => paragraph.length > 0)
                      .map((paragraph, index) => (
                        <p key={`${page.pageNumber}-paragraph-${index}`}>
                          {paragraph}
                        </p>
                      ))}
                  </div>
                ) : (
                  <p>No text blocks detected.</p>
                )}
              </article>
            ))}
          </div>
        ) : (
          <p className="placeholder">Run an OCR job to inspect structured results here.</p>
        )}
      </section>
    </main>
  );
}

export default App;
