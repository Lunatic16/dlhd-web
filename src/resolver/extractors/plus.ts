const OBFUSCATED_ARRAY_RE = /var _\w+=\[([^\]]+)\],_\w+=(\d+),_\w+=(\d+)/;

export function deobfuscatePlusScript(html: string): string | null {
  const match = html.match(OBFUSCATED_ARRAY_RE);
  if (!match) return null;
  const nums = match[1].split(",").map((n) => Number(n.trim()));
  const xor = Number(match[2]);
  const sub = Number(match[3]);
  return nums.map((n) => String.fromCharCode(((n ^ xor) - sub + 256) % 256)).join("");
}

export function extractPlusM3u8(html: string): string | null {
  const deob = deobfuscatePlusScript(html);
  const source = deob ?? html;
  const quoted = source.match(/SIGNED_URL\s*=\s*"([^"]+\.m3u8[^"]*)"/)?.[1];
  if (quoted) return quoted;
  return source.match(/https:\/\/[^"'`\s]+\.m3u8[^"'`\s]*/)?.[0] ?? null;
}

export function extractPlusMeta(html: string): Record<string, string> {
  const deob = deobfuscatePlusScript(html) ?? html;
  const channelId = html.match(/data-id="([^"]+)"/)?.[1];
  const token = deob.match(/token:\s*"([^"]+)"/)?.[1];
  const meta: Record<string, string> = {};
  if (channelId) meta.channelId = channelId;
  if (token) meta.token = token;
  return meta;
}
