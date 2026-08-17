const STREAM_URL_RE = /streamUrl:\s*"((?:\\\/|[^"])+)"/;

export function extractWideiptvM3u8(html: string): string | null {
  const raw = html.match(STREAM_URL_RE)?.[1];
  if (!raw) return null;
  return raw.replace(/\\\//g, "/");
}

export function extractWideiptvSlug(html: string): string | null {
  return html.match(/channelSlug:\s*"([^"]+)"/)?.[1] ?? null;
}
