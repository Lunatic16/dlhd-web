export function decryptAssetrageConfig(b64: string): Record<string, any> | null {
  try {
    const order = [2, 0, 3, 1];
    const partsCount = 4;
    const decoded = Buffer.from(b64, "base64").toString("binary");
    const partLen = Math.ceil(decoded.length / partsCount);
    const parts: string[] = [];
    let offset = 0;
    for (let i = 0; i < partsCount; i++) {
      parts.push(decoded.substr(offset, partLen));
      offset += partLen;
    }
    const ordered: string[] = [];
    for (let i = 0; i < order.length; i++) {
      let p = String(parts[i]);
      p = p.slice(0, 3) + p.slice(4);
      ordered[order[i]] = Buffer.from(p, "base64").toString("binary");
    }
    const joined = ordered.join("");
    return JSON.parse(Buffer.from(joined, "base64").toString("utf8"));
  } catch {
    return null;
  }
}

export function extractAssetrageM3u8(html: string): string | null {
  const match = html.match(/window\._econfig\s*=\s*'([^']+)'/);
  if (!match) return null;
  const config = decryptAssetrageConfig(match[1]);
  if (!config) return null;
  return config.stream_url || config.stream_url_nop2p || config.url || null;
}
