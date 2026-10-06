export const API_BASE_URL = "/api/v1";
const DEFAULT_REQUEST_TIMEOUT_MS = 20_000;

export class ApiError extends Error {
  status: number;
  data?: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

// Simple wrapper for fetch
export async function apiFetch(
  endpoint: string,
  options: RequestInit = {}
) {
  const url = `${API_BASE_URL}${endpoint}`;

  const headers = {
    ...(!options.body || typeof options.body === 'string' ? { "Content-Type": "application/json" } : {}),
    "x-requested-with": "XMLHttpRequest",
    ...options.headers,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new DOMException("Request timed out", "TimeoutError")), DEFAULT_REQUEST_TIMEOUT_MS);
  const abortFromCaller = () => controller.abort(options.signal?.reason);
  if (options.signal?.aborted) abortFromCaller();
  else options.signal?.addEventListener("abort", abortFromCaller, { once: true });

  let response: Response;
  try {
    response = await fetch(url, {
      credentials: "include",
      ...options,
      signal: controller.signal,
      headers,
    });
  } catch (error) {
    if (controller.signal.reason instanceof DOMException && controller.signal.reason.name === "TimeoutError") {
      throw new ApiError(0, "The request timed out. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener("abort", abortFromCaller);
  }

  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = null;
    }
    throw new ApiError(response.status, errorData?.detail || `API error: ${response.status}`, errorData);
  }

  return response;
}
