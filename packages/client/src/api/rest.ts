const BASE = "";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(options?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed: ${res.status}`);
  }
  return res.json();
}

export interface Me {
  userId: string;
  username: string;
}

export function fetchMe(): Promise<Me> {
  return request<Me>("/api/auth/me");
}

export function login(username: string, password: string) {
  return request("/api/auth/login", { method: "POST", body: JSON.stringify({ username, password }) });
}

export function register(username: string, password: string, displayName?: string) {
  return request("/api/auth/register", {
    method: "POST",
    body: JSON.stringify({ username, password, displayName }),
  });
}

export function logout() {
  return request("/api/auth/logout", { method: "POST" });
}

export function getSessionHands(sessionId: string) {
  return request(`/api/sessions/${sessionId}/hands`);
}

export function getHandDetail(handId: string) {
  return request(`/api/hands/${handId}`);
}

export function getUserStats(userId: string) {
  return request(`/api/users/${userId}/stats`);
}
