export function extractWikiSportLiveId(html: string): string | null {
  return html.match(/fid\s*=\s*["']([^"']+)["']/)?.[1] ?? null;
}

export function buildWikiPhpUrl(liveId: string): string {
  return `https://igniteandship.com/wiki.php?player=desktop&live=${encodeURIComponent(liveId)}`;
}

export function isWikiSportPage(url: string): boolean {
  return url.includes("wikisport.info");
}
