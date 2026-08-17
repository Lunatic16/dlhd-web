function decodeChunk(value: string): string {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  return Buffer.from(padded, "base64").toString("utf8");
}

export function extractCdnLiveTvM3u8(html: string): string | null {
  const decoder = html.match(/function (\w+)\(s\)\{[^}]*atob/)?.[1];
  const assign = html.match(new RegExp(`var (\\w+)=((?:${decoder ?? "\\w+"}\\(\\w+\\)\\+?)+);\\s*var _p2pMode`));
  if (!decoder || !assign) return null;
  const vars = new Map<string, string>();
  for (const match of html.matchAll(/var (\w+)='([A-Za-z0-9+/=_-]+)'/g)) {
    vars.set(match[1], match[2]);
  }
  const url = [...assign[2].matchAll(new RegExp(`${decoder}\\((\\w+)\\)`, "g"))]
    .map((part) => decodeChunk(vars.get(part[1]) ?? ""))
    .join("");
  return url.includes(".m3u8") ? url : null;
}
