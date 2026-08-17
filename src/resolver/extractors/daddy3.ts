const ATOB_RE = /atob\('([^']+)'\)/;
const M3U8_RE =
  /https:\/\/[^"'`\s]+\/three\/secure\/[0-9a-f]{32}\/\d+\/premium\d+\/index\.m3u8/;

export function extractDaddy3M3u8(html: string): string | null {
  const b64 = html.match(ATOB_RE)?.[1];
  if (b64) {
    try {
      const url = Buffer.from(b64, "base64").toString("utf8");
      if (url.startsWith("http") && url.includes(".m3u8")) return url;
    } catch {
      return null;
    }
  }
  return html.match(M3U8_RE)?.[0] ?? null;
}

export function extractDaddy3Meta(html: string): Record<string, string> {
  const token = html.match(/token:\s*"([^"]+)"/)?.[1];
  const channelId = html.match(/channelId:\s*"([^"]+)"/)?.[1];
  const announce = html.match(/announce:\s*"([^"]+)"/)?.[1];
  const meta: Record<string, string> = {};
  if (token) meta.token = token;
  if (channelId) meta.channelId = channelId;
  if (announce) meta.announce = announce;
  return meta;
}
