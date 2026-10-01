api_content = """export const API_BASE_URL = "/api/v1";

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

  const response = await fetch(url, {
    credentials: "include",
    ...options,
    headers,
  });

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
"""

with open("frontend/lib/api.ts", "w", encoding="utf-8") as f:
    f.write(api_content)
