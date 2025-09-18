export const readFileAsBase64 = (file: File): Promise<string> => {
  console.log('readFileAsBase64: start');
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;
      if (typeof result === 'string') {
        const base64 = result.split(',')[1] ?? '';
        console.log('readFileAsBase64: success');
        resolve(base64);
      } else {
        console.error('readFileAsBase64: error - Unsupported file reader result.');
        reject(new Error('Unsupported file reader result.'));
      }
    };

    reader.onerror = () => {
      console.error('readFileAsBase64: error', reader.error);
      reject(reader.error ?? new Error('Failed to read file.'));
    };

    reader.readAsDataURL(file);
  });
};

export const parsePageSelection = (value: string): number[] | undefined => {
  console.log('parsePageSelection: start', { value });
  const trimmed = value.trim();
  if (!trimmed) {
    console.log('parsePageSelection: result', undefined);
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
      if (start > end) {
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

  const result = pages.size ? Array.from(pages).sort((a, b) => a - b) : undefined;
  console.log('parsePageSelection: result', result);
  return result;
};
