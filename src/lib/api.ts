const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8080/api'

function getToken(): string | null {
  try {
    return localStorage.getItem('prestamos-token')
  } catch {
    return null
  }
}

export function setToken(token: string | null): void {
  if (token) {
    localStorage.setItem('prestamos-token', token)
  } else {
    localStorage.removeItem('prestamos-token')
  }
}

export function clearToken(): void {
  localStorage.removeItem('prestamos-token')
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  options?: { headers?: Record<string, string> }
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...options?.headers,
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    clearToken()
    window.location.href = '/login'
    throw new Error('Sesión expirada')
  }

  if (res.status === 204) {
    return undefined as T
  }

  const json = await res.json()

  if (!res.ok) {
    const msg =
      json?.message ||
      json?.error ||
      Object.values(json?.errors || {}).flat().join(', ') ||
      `Error ${res.status}`
    throw new Error(msg)
  }

  return json as T
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body?: unknown) => request<T>('POST', path, body),
  put: <T>(path: string, body?: unknown) => request<T>('PUT', path, body),
  patch: <T>(path: string, body?: unknown) => request<T>('PATCH', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
  upload: <T>(path: string, formData: FormData) =>
    request<T>('POST', path, formData, {
      headers: {}, // let fetch set Content-Type with boundary
    }),
}
