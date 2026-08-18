function shellQuote(value: string): string {
  return `'${value.replace(/'/g, `'\\''`)}'`;
}

export function buildProxyUrl(directUrl: string, referer: string, origin: string): string {
  const params = new URLSearchParams({ url: directUrl, referer });
  return `${origin.replace(/\/$/, "")}/api/proxy?${params}`;
}

export function buildVlcCommand(directUrl: string, referer: string, origin: string): string {
  return `vlc --http-referrer ${shellQuote(referer)} ${shellQuote(buildProxyUrl(directUrl,referer,origin))}`;
}

export function buildMpvCommand(directUrl: string, referer: string, origin: string, title?: string): string {
  const parts = title
    ? [`mpv --force-media-title=${shellQuote(title)}`, `--referrer=${shellQuote(referer)}`, shellQuote(buildProxyUrl(directUrl,referer,origin))]
    : [`mpv --referrer=${shellQuote(referer)}`, shellQuote(buildProxyUrl(directUrl,referer,origin))];
  return parts.join(" ");
}
