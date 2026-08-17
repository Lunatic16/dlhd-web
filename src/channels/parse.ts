import type { Channel } from "./types.js";

export function parseChannelList(html: string): Channel[] {
  const seen = new Set<number>();
  const channels: Channel[] = [];

  // Match <a> tags with card links or watch page links
  const cardRe = /<a[^>]+href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;

  for (const match of html.matchAll(cardRe)) {
    const href = match[1];
    const innerHtml = match[2];

    const idMatch = href.match(/id=(\d+)/i) || href.match(/stream-(\d+)\.php/i) || href.match(/\/(\d+)\/?$/);
    if (!idMatch) continue;

    const id = Number(idMatch[1]);
    if (!Number.isFinite(id) || id < 1 || seen.has(id)) continue;

    // Extract title from card__title or clean text content
    let name = "";
    const titleMatch = innerHtml.match(/class=["'][^"']*card__title[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    if (titleMatch) {
      name = titleMatch[1].replace(/<[^>]+>/g, "").trim();
    } else {
      // Fallback to title attribute or clean inner HTML
      const titleAttrMatch = match[0].match(/title=["']([^"']+)["']/i);
      if (titleAttrMatch) {
        name = titleAttrMatch[1].trim();
      } else {
        name = innerHtml.replace(/<[^>]+>/g, "").trim();
      }
    }

    if (!name || name.toLowerCase() === "unknown") continue;

    seen.add(id);
    channels.push({ id, name });
  }

  // Fallback regex matching standard watch links if card format wasn't found
  if (channels.length === 0) {
    const listRe = /watch\.php\?id=(\d+)"[^>]*title="([^"]+)"/g;
    for (const match of html.matchAll(listRe)) {
      const id = Number(match[1]);
      if (!Number.isFinite(id) || seen.has(id)) continue;
      seen.add(id);
      channels.push({ id, name: match[2].trim() });
    }
  }

  return channels.sort((a, b) => a.name.localeCompare(b.name));
}
