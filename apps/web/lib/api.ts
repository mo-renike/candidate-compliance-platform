const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080/api";

interface ApiError {
  statusCode?: number;
  status?: number;
  message?: string | string[];
  error?: string;
  detail?: string;
  title?: string;
}

export async function api<T>(
  endpoint: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("accessToken") : null;

  const headers = new Headers(options.headers);

  const isFormData = options.body instanceof FormData;

  if (!headers.has("Content-Type") && options.body && !isFormData) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let error: ApiError = {};

    try {
      error = await response.json();
    } catch {}

    const message = Array.isArray(error.message)
      ? error.message.join(", ")
      : error.message;

    throw new Error(message || "Something went wrong");
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
