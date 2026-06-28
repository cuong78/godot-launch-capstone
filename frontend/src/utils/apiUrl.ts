const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

export const resolveApiUrl = (path?: string | null) => {
  if (!path) {
    return null;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  const normalizedBase = API_BASE_URL.endsWith('/') ? API_BASE_URL : `${API_BASE_URL}/`;
  return new URL(path.replace(/^\//, ''), normalizedBase).toString();
};
