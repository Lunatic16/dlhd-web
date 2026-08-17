export function extractIgniteShipM3u8(html: string): string | null {
  const fn = html.match(/player\.load\(\{source:\s*(\w+)\(\)/)?.[1];
  if (!fn) return null;
  const body = html.match(new RegExp(`function ${fn}\\(\\)\\s*\\{([\\s\\S]*?)\\n\\s*\\}`))?.[1];
  if (!body) return null;
  const chars = body.match(/return\(\[([^\]]+)\]/)?.[1];
  if (!chars) return null;
  const base = [...chars.matchAll(/"([^"]*)"/g)].map((part) => part[1]).join("");
  const spanId = body.match(/getElementById\("([^"]+)"\)/)?.[1];
  const span = spanId
    ? html.match(new RegExp(`id=["']${spanId}["'][^>]*>([^<]*)`,))?.[1] ?? ""
    : "";
  const url = (base + span).replace(/\\\//g, "/");
  return url.startsWith("http") && url.includes(".m3u8") ? url : null;
}

export function isIgniteShipPage(url: string): boolean {
  return url.includes("igniteandship.com");
}
