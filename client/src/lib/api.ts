export function getApiUrl(path: string): string {
  let baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8010';
  
  // Security: Ensure baseUrl is absolute and starts with http/https
  if (!baseUrl.startsWith('http')) {
    baseUrl = `https://${baseUrl}`;
  }

  // Remove trailing slash from baseUrl if exists
  const normalizedBase = baseUrl.replace(/\/$/, '');
  // Ensure path starts with slash
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${normalizedBase}${normalizedPath}`;
}