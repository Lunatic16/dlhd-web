import { Impit } from "impit";

export const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

let impitClient: Impit | null = null;

export function getImpit(): Impit {
  if (!impitClient) {
    impitClient = new Impit({ browser: "chrome", timeout: 30000 });
  }
  return impitClient;
}

export function htmlHeaders(referer: string): Record<string, string> {
  let origin = "";
  try {
    origin = new URL(referer).origin;
  } catch {}
  return {
    "User-Agent": UA,
    Referer: referer,
    ...(origin ? { Origin: origin } : {}),
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  };
}

export function proxyHeaders(referer: string): Record<string, string> {
  let origin = "";
  try {
    origin = new URL(referer).origin;
  } catch {}
  return {
    "User-Agent": UA,
    Referer: referer,
    ...(origin ? { Origin: origin } : {}),
    Accept: "*/*",
  };
}

export async function fetchHtml(url: string, referer: string): Promise<string> {
  // Use native fetch first for standard pages, with automatic fallback
  try {
    const res = await fetch(url, { headers: htmlHeaders(referer), redirect: "follow" });
    if (res.ok) {
      return await res.text();
    }
    // If native fetch is 403 or failed, try Impit Chrome TLS
    if (res.status === 403 || res.status >= 500) {
      const impitRes = await getImpit().fetch(url, {
        headers: htmlHeaders(referer),
        redirect: "follow",
        timeout: 20000,
      });
      if (impitRes.ok) {
        return await impitRes.text();
      }
    }
    throw new Error(`fetch failed (HTTP ${res.status}): ${url}`);
  } catch (err: any) {
    if (err?.message?.includes("fetch failed (HTTP")) throw err;
    // Retry with impit if network error
    try {
      const impitRes = await getImpit().fetch(url, {
        headers: htmlHeaders(referer),
        redirect: "follow",
        timeout: 20000,
      });
      if (impitRes.ok) return await impitRes.text();
      throw new Error(`fetch failed (HTTP ${impitRes.status}): ${url}`);
    } catch {
      throw err;
    }
  }
}
