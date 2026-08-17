import { fetchHtml, htmlHeaders } from "../http.js";
import { extractBloggerZdecUrl, isBloggerPlayerPage } from "../resolver/extractors/blogger-player.js";
import {
  buildWikiPhpUrl,
  extractWikiSportLiveId,
  isWikiSportPage,
} from "../resolver/extractors/wikisport.js";

function resolveIframeSrc(src: string, base: string): string | null {
  const trimmed = src.trim();
  if (!trimmed || /\+|'|window\.|javascript:|about:|data:/i.test(trimmed)) return null;
  try {
    const url = new URL(trimmed, base);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.href;
  } catch {
    return null;
  }
}

export async function resolveRedirectUrl(url: string, referer: string): Promise<string> {
  const res = await fetch(url, { headers: htmlHeaders(referer), redirect: "manual" });
  const location = res.headers.get("location");
  if (res.status >= 300 && res.status < 400 && location) {
    return new URL(location, url).href;
  }
  return url;
}

async function resolveScriptedNextUrl(
  html: string,
  pageUrl: string,
  referer: string,
): Promise<string | null> {
  if (isWikiSportPage(pageUrl)) {
    const liveId = extractWikiSportLiveId(html);
    if (liveId) return buildWikiPhpUrl(liveId);
  }
  if (isBloggerPlayerPage(pageUrl)) {
    const target = extractBloggerZdecUrl(html);
    if (target) return resolveRedirectUrl(target, referer);
  }
  return null;
}

export async function fetchEmbedHtmlChain(
  embedUrl: string,
  html: string,
  hasPlayable: (body: string) => boolean | Promise<boolean>,
): Promise<{ html: string; referer: string }> {
  let current = html;
  let referer = embedUrl;
  for (let depth = 0; depth < 6; depth++) {
    if (await hasPlayable(current)) return { html: current, referer };
    const inner = current.match(/<iframe[^>]+src="([^"]+)"/i)?.[1];
    if (inner) {
      const nextUrl = resolveIframeSrc(inner, referer);
      if (nextUrl) {
        current = await fetchHtml(nextUrl, referer);
        referer = nextUrl;
        continue;
      }
    }
    const scripted = await resolveScriptedNextUrl(current, referer, referer);
    if (!scripted || scripted === referer) break;
    current = await fetchHtml(scripted, referer);
    referer = scripted;
  }
  return { html: current, referer };
}
