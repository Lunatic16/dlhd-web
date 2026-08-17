function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildProxyUrl(directUrl: string, referer: string, origin: string): string {
  const params = new URLSearchParams({ url: directUrl, referer });
  return `${origin.replace(/\/$/, "")}/api/proxy?${params}`;
}

export function buildVlcCommand(directUrl: string, referer: string): string {
  return `vlc --http-referrer ${shellQuote(referer)} ${shellQuote(directUrl)}`;
}

export function buildMpvCommand(directUrl: string, referer: string, title?: string): string {
  const parts = title
    ? [`mpv --force-media-title=${shellQuote(title)}`, `--referrer=${shellQuote(referer)}`, shellQuote(directUrl)]
    : [`mpv --referrer=${shellQuote(referer)}`, shellQuote(directUrl)];
  return parts.join(" ");
}
