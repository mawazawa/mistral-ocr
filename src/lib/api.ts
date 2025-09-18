/**
 * A regular expression to identify loopback hostnames (e.g., localhost, 127.0.0.1, ::1).
 */
const LOOPBACK_HOST_PATTERN = /^(localhost|(?:127(?:\.\d{1,3}){3})|\[?::1\]?)(?:$|:)/i;

/**
 * Checks if a given hostname is a loopback address.
 * This is important for security, to prevent server-side request forgery (SSRF)
 * by ensuring that API calls from a public host do not target a local service.
 * @param {string} hostname - The hostname to check.
 * @returns {boolean} True if the hostname is a loopback address, false otherwise.
 */
const isLoopbackHost = (hostname: string): boolean => {
  const lower = hostname.toLowerCase();
  return (
    lower === 'localhost' ||
    lower.endsWith('.localhost') ||
    lower === '::1' ||
    lower === '[::1]' ||
    lower.startsWith('127.') ||
    LOOPBACK_HOST_PATTERN.test(lower)
  );
};

/**
 * Creates a URL resolver function.
 * This factory function takes an optional base URL and returns a resolver
 * that can construct full API URLs from a given path.
 *
 * It includes a security check to prevent resolving to a loopback host
 * when the current page is not served from a loopback host.
 *
 * @param {string} [configuredBaseUrl] - The base URL for the API.
 * @returns {(path: string) => string} A function that takes a path and returns a full URL.
 */
export const createApiUrlResolver = (configuredBaseUrl?: string) => {
  const trimmedBase = configuredBaseUrl?.trim();

  return (path: string): string => {
    // If no base URL is configured, return the path as-is.
    if (!trimmedBase) {
      return path;
    }

    try {
      const url = new URL(path, trimmedBase);

      // In the browser, prevent requests to loopback hosts if the app itself isn't on a loopback host.
      if (typeof window !== 'undefined' && window.location) {
        const currentHost = window.location.hostname;
        if (!isLoopbackHost(currentHost) && isLoopbackHost(url.hostname)) {
          // Block the request by returning the original path, which is likely to fail safely.
          return path;
        }
      }

      return url.toString();
    } catch (error) {
      // If URL creation fails, fall back to the original path.
      return path;
    }
  };
};

/**
 * A ready-to-use URL resolver that uses the VITE_API_BASE_URL from environment variables.
 * @param {string} path - The API path to resolve (e.g., '/api/ocr').
 * @returns {string} The fully resolved API URL.
 */
export const resolveApiUrl = (path: string): string => {
  const base = import.meta.env.VITE_API_BASE_URL;
  return createApiUrlResolver(base)(path);
};
