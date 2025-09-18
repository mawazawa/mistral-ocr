/**
 * Reads a `File` object and converts it to a base64 encoded string.
 *
 * @param {File} file - The file to read.
 * @returns {Promise<string>} A promise that resolves with the base64 string,
 * excluding the data URL prefix.
 */
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

/**
 * Parses a string of page selections into a sorted array of unique numbers.
 *
 * The string can contain individual numbers and ranges, separated by commas.
 * For example, "1, 3-5, 8" becomes `[1, 3, 4, 5, 8]`.
 *
 * @param {string} value - The string to parse.
 * @returns {number[] | undefined} A sorted array of page numbers, or undefined if the input is empty.
 */
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

  return pages.size ? Array.from(pages).sort((a, b) => a - b) : undefined;
};
