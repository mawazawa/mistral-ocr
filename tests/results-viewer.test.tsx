import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { ResultsViewer } from '../src/components/ResultsViewer';
import type { DisplayPage } from '../src/lib/ocr';

const makePages = (): DisplayPage[] => [
  { pageNumber: 1, blocks: [{ type: 'paragraph', text: 'Hello World' }], markdown: 'Hello World' },
  { pageNumber: 2, blocks: [{ type: 'paragraph', text: 'Second Page' }], markdown: 'Second Page' },
];

describe('ResultsViewer', () => {
  it('renders tabs and defaults to structured view', () => {
    render(<ResultsViewer pages={makePages()} />);
    expect(screen.getByRole('tab', { name: 'Structured' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('switches to markdown tab and renders markdown paragraphs', () => {
    render(<ResultsViewer pages={makePages()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Markdown' }));
    expect(screen.getByRole('tab', { name: 'Markdown' })).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('pagination next/prev and mini-map jump work', () => {
    render(<ResultsViewer pages={makePages()} />);
    const next = screen.getByRole('button', { name: 'Next page' });
    fireEvent.click(next);
    expect(screen.getByText('Page 2 of 2')).toBeInTheDocument();

    const miniMapPage1 = screen.getByRole('button', { name: '1' });
    fireEvent.click(miniMapPage1);
    expect(screen.getByText('Page 1 of 2')).toBeInTheDocument();
  });

  it('zoom buttons toggle active state', () => {
    render(<ResultsViewer pages={makePages()} />);
    const zoom125 = screen.getByRole('button', { name: '125%' });
    fireEvent.click(zoom125);
    expect(zoom125).toHaveAttribute('aria-pressed', 'true');
  });

  it('document tab renders iframe when URL is provided', () => {
    render(<ResultsViewer pages={makePages()} documentUrl="https://example.com/doc.pdf" />);
    fireEvent.click(screen.getByRole('tab', { name: 'Document' }));
    const frame = screen.getByTitle('Document Viewer');
    expect(frame).toBeInTheDocument();
  });
});
