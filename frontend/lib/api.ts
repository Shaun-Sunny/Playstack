const rawBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() ?? "";
const baseUrl = rawBaseUrl.replace(/\/$/, "");

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!baseUrl) {
    return normalizedPath;
  }

  return `${baseUrl}${normalizedPath}`;
}

export async function apiFetch(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);

  if (init.body && !headers.has("Content-Type") && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(buildUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });
}

export { baseUrl as apiBaseUrl };