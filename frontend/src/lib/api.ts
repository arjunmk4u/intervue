const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:5000';

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('intervue_auth_token');
}

export function setAuthToken(token: string | null): void {
  if (typeof window === 'undefined') return;
  if (token) {
    localStorage.setItem('intervue_auth_token', token);
  } else {
    localStorage.removeItem('intervue_auth_token');
  }
}

export async function apiFetch(endpoint: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const url = endpoint.startsWith('http') ? endpoint : `${BACKEND_URL}${endpoint}`;

  const headers = new Headers(options.headers || {});
  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  // If body is not FormData, ensure Content-Type application/json is present if needed
  if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Support HTTP-only cookies alongside Bearer token
  });
}

export { BACKEND_URL };
