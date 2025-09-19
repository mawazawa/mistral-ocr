import React, { useMemo, useState } from 'react';
import type { DisplayPage } from '../lib/ocr';

export type ResultsTab = 'structured' | 'markdown' | 'document';

interface ResultsViewerProps {
  pages: DisplayPage[];
  documentUrl?: string;
  answer?: string;
  models?: { model?: string; qaModel?: string };
}

export const ResultsViewer: React.FC<ResultsViewerProps> = ({ pages, documentUrl, answer }) => {
  const [activeTab, setActiveTab] = useState<ResultsTab>('structured');
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState<number>(100);

  const totalPages = pages.length;
  const safeCurrentPage = Math.min(Math.max(currentPage, 1), Math.max(totalPages, 1));

  const page = useMemo(() => {
    return pages[safeCurrentPage - 1];
  }, [pages, safeCurrentPage]);

  const canPrev = safeCurrentPage > 1;
  const canNext = safeCurrentPage < totalPages;

  const handlePrev = () => canPrev && setCurrentPage((p) => Math.max(p - 1, 1));
  const handleNext = () => canNext && setCurrentPage((p) => Math.min(p + 1, totalPages));

  const handleMiniMapClick = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  const setZoomPercent = (value: number) => setZoom(value);

  return (
    <div className="results-viewer" data-testid="results-viewer">
      <header>
        <div className="tabs" role="tablist" aria-label="Results tabs">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'structured'}
            className={`tab ${activeTab === 'structured' ? 'active' : ''}`}
            onClick={() => setActiveTab('structured')}
          >
            Structured
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'markdown'}
            className={`tab ${activeTab === 'markdown' ? 'active' : ''}`}
            onClick={() => setActiveTab('markdown')}
          >
            Markdown
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'document'}
            className={`tab ${activeTab === 'document' ? 'active' : ''}`}
            onClick={() => setActiveTab('document')}
          >
            Document
          </button>
        </div>
      </header>

      {answer ? (
        <article className="answer">
          <h3>Answer</h3>
          <p>{answer}</p>
        </article>
      ) : null}

      {totalPages ? (
        activeTab === 'document' ? (
          <div className="document-viewer">
            {documentUrl ? (
              <iframe
                title="Document Viewer"
                src={documentUrl}
                className="pdf-frame"
                sandbox="allow-same-origin allow-downloads"
              />
            ) : (
              <p className="placeholder">No document URL available for preview.</p>
            )}
          </div>
        ) : (
          <div className="viewer-shell">
            <div className="viewer-controls" data-testid="viewer-controls">
              <div className="pagination">
                <button type="button" onClick={handlePrev} disabled={!canPrev} aria-label="Previous page">
                  ◀︎
                </button>
                <span>
                  Page {safeCurrentPage} of {totalPages}
                </span>
                <button type="button" onClick={handleNext} disabled={!canNext} aria-label="Next page">
                  ▶︎
                </button>
              </div>
              <div className="zoom" aria-label="Zoom">
                {[100, 125, 150].map((z) => (
                  <button
                    key={z}
                    type="button"
                    className={`zoom-btn ${zoom === z ? 'active' : ''}`}
                    onClick={() => setZoomPercent(z)}
                    aria-pressed={zoom === z}
                  >
                    {z}%
                  </button>
                ))}
              </div>
            </div>

            <div className="viewer-body">
              <aside className="mini-map" data-testid="mini-map">
                <ul>
                  {pages.map((p) => (
                    <li key={p.pageNumber}>
                      <button
                        type="button"
                        className={`mini-map-page ${p.pageNumber === safeCurrentPage ? 'active' : ''}`}
                        onClick={() => handleMiniMapClick(p.pageNumber)}
                        aria-current={p.pageNumber === safeCurrentPage ? 'page' : undefined}
                      >
                        {p.pageNumber}
                      </button>
                    </li>
                  ))}
                </ul>
              </aside>

              <section className="page-stage" style={{ ['--zoom' as unknown as string]: `${zoom}%` }}>
                <article className="page-card scaled" data-zoom={`${zoom}`}>
                  <h3>Page {page.pageNumber}</h3>
                  {activeTab === 'structured' ? (
                    page.blocks.length ? (
                      <ul>
                        {page.blocks.slice(0, 100).map((block, index) => (
                          <li key={block.id ?? `${page.pageNumber}-${index}`}>
                            <span className="tag">{block.type ?? 'text'}</span>
                            <p>{block.label && block.value ? `${block.label}: ${block.value}` : block.text ?? 'Unknown block'}</p>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No structured blocks detected.</p>
                    )
                  ) : (
                    page.markdown ? (
                      <div className="markdown-result">
                        {page.markdown
                          .split(/\n\s*\n/)
                          .map((paragraph) => paragraph.trim())
                          .filter((paragraph) => paragraph.length > 0)
                          .map((paragraph, index) => (
                            <p key={`${page.pageNumber}-paragraph-${index}`}>{paragraph}</p>
                          ))}
                      </div>
                    ) : (
                      <p>No markdown available.</p>
                    )
                  )}
                </article>
              </section>
            </div>
          </div>
        )
      ) : (
        <p className="placeholder">Your document analysis will appear here</p>
      )}
    </div>
  );
};

export default ResultsViewer;
