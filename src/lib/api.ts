const LOOPBACK_HOST_PATTERN = /^(localhost|(?:127(?:\.\d{1,3}){3})|\[?::1\]?)(?:$|:)/i;

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

export const createApiUrlResolver = (configuredBaseUrl?: string) => {
  const trimmedBase = configuredBaseUrl?.trim();

  return (path: string): string => {
    if (!trimmedBase) {
      return path;
    }

    try {
      const url = new URL(path, trimmedBase);

      if (typeof window !== 'undefined' && window.location) {
        const currentHost = window.location.hostname;
        if (!isLoopbackHost(currentHost) && isLoopbackHost(url.hostname)) {
          return path;
        }
      }

      return url.toString();
    } catch {
      return path;
    }
  };
};

export const resolveApiUrl = (path: string): string => {
  const base = import.meta.env.VITE_API_BASE_URL;
  return createApiUrlResolver(base)(path);
};
