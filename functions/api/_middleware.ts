const ALLOWED_ORIGINS = new Set([
  'capacitor://localhost',
  'ionic://localhost',
  'http://localhost',
  'https://localhost',
  'https://lifenum.pages.dev',
]);

function corsHeaders(origin: string | null): Record<string, string> | null {
  if (!origin || !ALLOWED_ORIGINS.has(origin)) return null;
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Platform',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

export const onRequest = async (context: any): Promise<Response> => {
  const origin = context.request.headers.get('Origin');
  const headers = corsHeaders(origin);

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: headers ?? undefined });
  }

  const response = await context.next();
  if (!headers) return response;

  const merged = new Headers(response.headers);
  for (const [key, value] of Object.entries(headers)) merged.set(key, value);
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: merged,
  });
};
