const IFRAME_RE =
  /<iframe[^>]+id="thatframe"[^>]+src="([^"]+)"|<iframe[^>]+src="([^"]+)"[^>]+id="thatframe"/i;
const VIDEO_IFRAME_RE =
  /<iframe[^>]+class="[^"]*video[^"]*"[^>]+src="([^"]+)"|<iframe[^>]+src="([^"]+)"[^>]+class="[^"]*video[^"]*"/gi;
const XOR_PAYLOAD_RE = /window\[['"]([^'"]+)['"]\]='([A-Za-z0-9+/=]{64,})'/;

export function extractEmbedUrl(html: string): string | null {
  const match = html.match(IFRAME_RE);
  if (match) return match[1] ?? match[2] ?? null;
  const videos = [...html.matchAll(VIDEO_IFRAME_RE)];
  if (!videos.length) return null;
  const last = videos[videos.length - 1];
  return last[1] ?? last[2] ?? null;
}

export function extractXorPayload(html: string): string | null {
  return html.match(XOR_PAYLOAD_RE)?.[2] ?? null;
}
