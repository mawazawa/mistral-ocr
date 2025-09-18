export const readFileAsBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.split(',')[1] ?? '';
        resolve(base64);
      } else {
        reject(new Error('Unsupported file reader result.'));
      }
    };

    reader.onerror = () => {
      reject(reader.error ?? new Error('Failed to read file.'));
    };

    reader.readAsDataURL(file);
  });
};

export const parsePageSelection = (value: string): number[] | undefined => {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const pages = new Set<number>();
  const segments = trimmed.split(',').map((segment) => segment.trim());

  for (const segment of segments) {
    if (!segment) {
      continue;
    }

    const rangeMatch = segment.match(/^(\d+)-(\d+)$/);
    if (rangeMatch) {
      const start = Number.parseInt(rangeMatch[1]!, 10);
      const end = Number.parseInt(rangeMatch[2]!, 10);
      if (start === 0 || start > end) {
        continue;
      }
      for (let page = start; page <= end; page += 1) {
        pages.add(page);
      }
      continue;
    }

    const pageNumber = Number.parseInt(segment, 10);
    if (Number.isFinite(pageNumber) && pageNumber > 0) {
      pages.add(pageNumber);
    }
  }

  return pages.size ? Array.from(pages).sort((a, b) => a - b) : undefined;
};
