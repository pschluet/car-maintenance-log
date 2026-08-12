"use client";

// Thin fetch wrapper for client components. API routes return 401 when the
// ID-token cookie is missing/expired; this transparently attempts one
// refresh (via the Node-runtime /api/auth/refresh route, which rotates the
// httpOnly cookies) and retries the original request exactly once before
// giving up and sending the user back to /login.

async function tryRefresh(): Promise<boolean> {
  const res = await fetch("/api/auth/refresh", { method: "POST" });
  return res.ok;
}

export async function apiFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const first = await fetch(input, init);
  if (first.status !== 401) return first;

  const refreshed = await tryRefresh();
  if (!refreshed) {
    window.location.href = "/login";
    return first;
  }
  return fetch(input, init);
}

export async function apiJson<T>(input: string, init: RequestInit = {}): Promise<T> {
  const res = await apiFetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error ?? `Request failed with ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
