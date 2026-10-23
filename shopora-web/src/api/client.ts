import axios, { AxiosError } from 'axios';

/** Shape of every API response: { success, data, error }. */
interface Envelope<T> {
  success: boolean;
  data: T | null;
  error: { code: string; message: string; fields?: Record<string, string[]> } | null;
}

/** A failed API call with the server's error code, message and per-field messages. */
export class ApiError extends Error {
  status: number;
  code: string;
  fields?: Record<string, string[]>;
  constructor(status: number, code: string, message: string, fields?: Record<string, string[]>) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

export const UNAUTHORIZED_EVENT = 'shopora:unauthorized';

const http = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  withCredentials: true, // sends the HttpOnly login cookie
  headers: { 'Content-Type': 'application/json' },
});

http.interceptors.response.use(
  (response) => response,
  (error: AxiosError<Envelope<unknown>>) => {
    if (!error.response) {
      throw new ApiError(0, 'NETWORK_ERROR', 'Cannot reach the server. Check your connection and make sure the API is running.');
    }
    const { status, data } = error.response;
    const url = error.config?.url ?? '';
    // A 401 on a normal call means the session ended; sign the user out of the UI.
    if (status === 401 && !url.startsWith('/auth/login') && !url.startsWith('/auth/me')) {
      window.dispatchEvent(new Event(UNAUTHORIZED_EVENT));
    }
    const apiError = data?.error;
    throw new ApiError(
      status,
      apiError?.code ?? `HTTP_${status}`,
      apiError?.message ?? 'Something went wrong. Please try again.',
      apiError?.fields,
    );
  },
);

function clean(params?: object): Record<string, unknown> | undefined {
  if (!params) return undefined;
  return Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== ''),
  );
}

export async function get<T>(url: string, params?: object): Promise<T> {
  const res = await http.get<Envelope<T>>(url, { params: clean(params) });
  return res.data.data as T;
}
export async function post<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.post<Envelope<T>>(url, body ?? {});
  return res.data.data as T;
}
export async function put<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.put<Envelope<T>>(url, body ?? {});
  return res.data.data as T;
}
export async function patch<T>(url: string, body?: unknown): Promise<T> {
  const res = await http.patch<Envelope<T>>(url, body ?? {});
  return res.data.data as T;
}
export async function del<T = void>(url: string): Promise<T> {
  const res = await http.delete<Envelope<T> | ''>(url);
  // 204 No Content has an empty body; other deletes return the usual envelope.
  const body = res.data;
  return (body && typeof body === 'object' ? body.data : undefined) as T;
}

/** A readable message for any thrown value. */
export function messageOf(error: unknown): string {
  if (error instanceof ApiError) {
    // For validation errors, the first field message is more helpful than the generic one.
    const first = error.fields ? Object.values(error.fields)[0]?.[0] : undefined;
    return first ?? error.message;
  }
  if (error instanceof Error) return error.message;
  return 'Something went wrong. Please try again.';
}
