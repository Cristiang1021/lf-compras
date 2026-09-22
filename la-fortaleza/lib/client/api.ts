"use client";

export type ApiOk<T> = { ok: true; data: T };
export type ApiErr = { ok: false; error: string; details?: unknown };
export type ApiResult<T> = ApiOk<T> | ApiErr;

const TOKEN_KEY = "lf_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

function withNgrokHeaders(headers: Headers) {
  // Evita la página intermedia de ngrok gratis en fetch/XHR
  headers.set("ngrok-skip-browser-warning", "69420");
}

export async function api<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body) {
    headers.set("Content-Type", "application/json");
  }
  withNgrokHeaders(headers);
  const token = getToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { ...init, headers });
  const contentType = res.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const json = (await res.json()) as ApiResult<T>;
    if (!res.ok || !json.ok) {
      const msg =
        !json.ok && "error" in json
          ? json.error
          : `Error HTTP ${res.status}`;
      throw new Error(msg);
    }
    return json.data;
  }

  if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
  // Respuesta no JSON (p. ej. aviso HTML de ngrok)
  throw new Error(
    "No se pudo completar la operación. Recarga la página e inténtalo de nuevo.",
  );
}

export async function downloadExport(path: string, filename: string) {
  const token = getToken();
  const headers = new Headers();
  withNgrokHeaders(headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(path, { headers });
  if (!res.ok) {
    try {
      const json = await res.json();
      throw new Error(json.error || `Error ${res.status}`);
    } catch (e) {
      if (e instanceof Error && e.message.startsWith("Error")) throw e;
      throw new Error(`No se pudo descargar (${res.status})`);
    }
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
