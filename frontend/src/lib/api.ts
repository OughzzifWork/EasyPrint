function getApiUrl(): string {
  if (typeof window === "undefined") return "http://localhost:4000";
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  return `${window.location.protocol}//${window.location.hostname}:4000`;
}

const API_URL = getApiUrl();

function getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = { ...extra };
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

export async function fetchApi<T = any>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const headers = getAuthHeaders(options.headers as Record<string, string> | undefined);

  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Erreur ${res.status}`);
  }

  const contentType = res.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return res.json();
  }
  return res as any;
}

export async function fetchApiRaw(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = getAuthHeaders(options.headers as Record<string, string> | undefined);

  if (options.body && typeof options.body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  return fetch(`${API_URL}${path}`, { ...options, headers, cache: "no-store" });
}
