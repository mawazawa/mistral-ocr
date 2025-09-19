import { useMemo, useState } from 'react';
import './App.css';
import { readFileAsBase64, parsePageSelection, validateFile } from './lib/file';
import { resolveApiUrl } from './lib/api';
import { prepareDisplayPages } from './lib/ocr';
import ResultsViewer from './components/ResultsViewer';
import type { OcrResponsePayload } from './types/mistral';

/**
 * Generates a human-readable description for an OCR block.
 *
 * @param {OcrBlock} block - The OCR block to describe.
 * @returns {string} A string description of the block.
 */
// Intentionally removed unused helper to satisfy lint rules

/**
 * The main application component.
 *
 * This component renders the user interface for the Mistral Document AI Playground.
 * It manages the application state, including the selected file, user inputs,
 * submission status, and API results. It handles the form submission to the
 * backend API and displays the OCR and Q&A results.
 *
 * @returns {JSX.Element} The rendered App component.
 */
function App() {
  const [file, setFile] = useState<File | null>(null);
  const [question, setQuestion] = useState('');
  const [pages, setPages] = useState('');
  const [includeImages, setIncludeImages] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<OcrResponsePayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files && event.target.files[0];
    
    if (nextFile) {
      handleFileSelection(nextFile);
    } else {
      setFile(null);
      setResult(null);
      setError(null);
    }
  };

  const handleFileSelection = (selectedFile: File) => {
    const validation = validateFile(selectedFile);
    if (!validation.isValid) {
      setError(validation.error || 'Invalid file');
      setFile(null);
      setResult(null);
      return;
    }
    
    setFile(selectedFile);
    setResult(null);
    setError(null);
  };

  const handleDragEnter = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    setIsDragOver(false);
    
    const droppedFiles = event.dataTransfer.files;
    if (droppedFiles.length > 0) {
      const droppedFile = droppedFiles[0];
      handleFileSelection(droppedFile);
    }
  };

  // Keyboard accessibility: make Enter/Space activate file input (handled on container)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!file) {
      setError('Please choose a PDF to analyse.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setResult(null);
    setUploadProgress(0);

    try {
      // Progress: Reading file
      setUploadProgress(20);
      const base64 = await readFileAsBase64(file);
      
      // Progress: Preparing payload
      setUploadProgress(40);
      const parsedPages = parsePageSelection(pages);
      const payload = {
        fileBase64: base64,
        fileName: file.name,
        includeImageBase64: includeImages,
        pages: parsedPages,
        query: question.trim() ? question.trim() : undefined,
      };

      // Progress: Sending request
      setUploadProgress(60);
      const response = await fetch(resolveApiUrl('/api/ocr'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        let message = 'Unexpected error while calling OCR API.';
        try {
          const errorData = await response.json();
          if (errorData.error?.message) {
            message = errorData.error.message;
          }
        } catch {
          // If response is not JSON, try to get text
          try {
            message = await response.text();
          } catch {
            // Keep default message if all parsing fails
          }
        }
        throw new Error(message);
      }

      // Progress: Processing response
      setUploadProgress(80);
      const data = (await response.json()) as OcrResponsePayload;
      setUploadProgress(100);
      setResult(data);
    } catch (submissionError) {
      let message = 'Failed to process document.';
      
      if (submissionError instanceof Error) {
        const errorMsg = submissionError.message.toLowerCase();
        
        // Categorize errors for better user experience
        if (errorMsg.includes('network') || errorMsg.includes('fetch')) {
          message = 'Network error. Please check your connection and try again.';
        } else if (errorMsg.includes('timeout') || errorMsg.includes('timed out')) {
          message = 'Request timed out. Please try again with a smaller file.';
        } else if (errorMsg.includes('file too large') || errorMsg.includes('payload too large')) {
          message = 'File is too large. Please choose a file smaller than 4MB.';
        } else if (errorMsg.includes('invalid') || errorMsg.includes('bad request')) {
          message = 'Invalid file or request. Please ensure you selected a valid PDF file.';
        } else if (errorMsg.includes('unauthorized') || errorMsg.includes('api key')) {
          message = 'Authentication error. Please contact support.';
        } else if (errorMsg.includes('rate limit') || errorMsg.includes('quota')) {
          message = 'Service temporarily unavailable. Please try again in a few minutes.';
        } else {
          // Use the original message if it's user-friendly, otherwise use generic message
          message = submissionError.message.length < 200 ? submissionError.message : message;
        }
      }
      
      setError(message);
    } finally {
      setIsSubmitting(false);
      setUploadProgress(0);
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
          <h1>Document Intelligence</h1>
          <p>
            Transform your PDFs into structured, searchable data with AI-powered OCR and Q&A capabilities.
          </p>
        </header>

        <form className="ocr-form" onSubmit={handleSubmit}>
          <div className="form-field">
            <span>PDF file</span>
            <div
              className={`file-upload-area ${isDragOver ? 'drag-over' : ''} ${file ? 'has-file' : ''}`}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              role="button"
              aria-label="Upload a PDF by clicking or dragging and dropping"
              aria-describedby="pdf-upload-help"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  const input = document.getElementById('pdf-upload') as HTMLInputElement | null;
                  input?.click();
                }
              }}
            >
              <input
                type="file"
                accept="application/pdf"
                onChange={handleFileChange}
                required
                disabled={isSubmitting}
                className="file-input"
                id="pdf-upload"
              />
              <label htmlFor="pdf-upload" className="file-upload-label" id="pdf-upload-help">
                {file ? (
                  <div className="file-selected">
                    <span className="file-icon">📋</span>
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                ) : isDragOver ? (
                  <div className="drag-prompt">
                    <span className="drag-icon">📋</span>
                    <span>Drop your PDF file here</span>
                  </div>
                ) : (
                  <div className="upload-prompt">
                    <span className="upload-icon">📎</span>
                    <span>Select a PDF or drag and drop</span>
                    <small>Maximum file size: 4.5 MB</small>
                  </div>
                )}
              </label>
            </div>
          </div>

          <label className="form-field">
            <span>Pages</span>
            <input
              type="text"
              placeholder="1, 3-5, 8 (optional)"
              value={pages}
              onChange={(event) => setPages(event.target.value)}
              disabled={isSubmitting}
            />
          </label>

          <label className="form-field">
            <span>Question</span>
            <textarea
              placeholder="Ask a question about your document..."
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
            <span>Include page images in response</span>
          </label>

          {isSubmitting && uploadProgress > 0 && (
            <div className="progress-container" role="status" aria-live="polite">
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <span className="progress-text">
                {uploadProgress < 40 ? 'Reading file...' :
                 uploadProgress < 60 ? 'Preparing request...' :
                 uploadProgress < 80 ? 'Processing with AI...' :
                 uploadProgress < 100 ? 'Finalizing...' : 'Complete!'}
              </span>
            </div>
          )}

          <button type="submit" disabled={isSubmitting || !file}>
            {isSubmitting ? 'Processing…' : 'Analyze Document'}
          </button>
        </form>

        {error ? <p className="error" role="alert" aria-live="assertive">{error}</p> : null}
      </section>

      <section className="panel results">
        <header>
          <h2>Analysis Results</h2>
          {result?.model ? (
            <p className="meta">
              Processed with <strong>{result.model}</strong>
              {result.qaModel ? ` and ${result.qaModel}` : ''}
            </p>
          ) : null}
        </header>

        {/* Tabs moved inside ResultsViewer */}

        <ResultsViewer
          pages={displayPages}
          documentUrl={result?.documentUrl}
          answer={result?.answer}
        />
      </section>
    </main>
  );
}

export default App;
