import { getImpit, proxyHeaders } from "../http.js";
import { buildProxyUrl } from "./links.js";
import { isM3u8Resource, isPoisonPlaylist } from "./media.js";
import { sanitizeSegmentBody } from "./segment.js";

const CORS = { "Access-Control-Allow-Origin": "*" };

export type ProxyResult = {
  status: number;
  body: string | Buffer;
  type: string;
  headers?: Record<string, string>;
};

async function fetchUpstream(url: string, referer: string) {
  try {
    const res = await getImpit().fetch(url, {
      headers: proxyHeaders(referer),
      redirect: "follow",
      timeout: 30000,
    });
    return {
      status: res.status,
      type: res.headers.get("content-type") || "",
      body: Buffer.from(await res.arrayBuffer()),
    };
  } catch {
    const res = await fetch(url, { headers: proxyHeaders(referer), redirect: "follow" });
    return {
      status: res.status,
      type: res.headers.get("content-type") || "",
      body: Buffer.from(await res.arrayBuffer()),
    };
  }
}

function proxiedLine(path: string, baseDir: string, referer: string, origin: string): string {
  return buildProxyUrl(new URL(path, baseDir).href, referer, origin);
}

function syncLiveMediaPlaylist(text: string): string {
  if (!text.includes("#EXTINF:") || text.includes("#EXT-X-ENDLIST") || text.includes("#EXT-X-STREAM-INF")) {
    return text;
  }

  const lines = text.split("\n");
  const header: string[] = [];
  const entries: { extinf: string; uri: string; duration: number }[] = [];
  let target = 4;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();
    if (trimmed.startsWith("#EXT-X-TARGETDURATION:")) {
      target = parseFloat(trimmed.slice(22)) || target;
    }
    if (trimmed.startsWith("#EXTINF:")) {
      const duration = parseFloat(trimmed.slice(8));
      const uriLine = lines[i + 1];
      if (uriLine !== undefined && uriLine.trim() && !uriLine.trim().startsWith("#")) {
        entries.push({ extinf: line, uri: lines[i + 1], duration });
        i += 2;
        continue;
      }
    }
    if (!entries.length) header.push(line);
    i += 1;
  }

  if (!entries.length) return text;

  const min = target * 0.95;
  const kept = entries.at(-1)!.duration < min ? entries.slice(0, -1) : entries;
  if (!kept.length) return text;

  const out = [...header];
  for (const entry of kept) {
    out.push(entry.extinf, entry.uri);
  }
  return out.join("\n");
}

function rewritePlaylist(playlist: string, playlistUrl: URL, referer: string, origin: string): string {
  const synced = syncLiveMediaPlaylist(playlist);
  const baseDir = playlistUrl.href.slice(0, playlistUrl.href.lastIndexOf("/") + 1);
  return synced
    .split("\n")
    .map((line) => {
      const trimmed = line.trim();
      if (!trimmed) return line;
      if (trimmed.startsWith("#")) {
        if (trimmed.startsWith("#EXT-X-MAP:")) {
          return trimmed.replace(/URI="([^"]+)"/, (_match, uri: string) =>
            `URI="${proxiedLine(uri, baseDir, referer, origin)}"`,
          );
        }
        return line.replace(/URI="([^"]+)"/g, (_match, uri: string) =>
          `URI="${proxiedLine(uri, baseDir, referer, origin)}"`,
        );
      }
      return proxiedLine(trimmed, baseDir, referer, origin);
    })
    .join("\n");
}

export async function proxyStream(query: URLSearchParams, origin: string): Promise<ProxyResult> {
  const target = query.get("url");
  const referer = query.get("referer");
  if (!target || !referer) {
    return { status: 400, body: "url and referer required", type: "text/plain" };
  }
  let upstreamUrl: URL;
  try {
    upstreamUrl = new URL(target);
  } catch {
    return { status: 400, body: "invalid url", type: "text/plain" };
  }
  if (upstreamUrl.protocol !== "http:" && upstreamUrl.protocol !== "https:") {
    return { status: 400, body: "unsupported protocol", type: "text/plain" };
  }

  try {
    const upstream = await fetchUpstream(target, referer);

    if (upstream.status >= 400) {
      return {
        status: upstream.status,
        body: `upstream responded with HTTP ${upstream.status}`,
        type: "text/plain",
        headers: CORS,
      };
    }

    if (isPoisonPlaylist(upstream.body)) {
      return {
        status: 502,
        body: "upstream playlist blocked or poisoned",
        type: "text/plain",
        headers: CORS,
      };
    }

    const isHls = isM3u8Resource(target, upstream.type) || upstream.body.toString("utf8", 0, 256).includes("#EXTM3U");

    if (isHls) {
      const text = upstream.body.toString("utf8");
      const body = text.startsWith("#EXTM3U")
        ? rewritePlaylist(text, upstreamUrl, referer, origin)
        : text;
      return {
        status: upstream.status,
        body,
        type: "application/vnd.apple.mpegurl",
        headers: { ...CORS, "Cache-Control": "no-cache, no-store, must-revalidate" },
      };
    }

    // Sanitize media segments (strip fake PNG headers and align sync byte)
    const sanitized = sanitizeSegmentBody(upstream.body);
    const contentType = upstream.type || (sanitized[0] === 0x47 ? "video/mp2t" : "application/octet-stream");

    return {
      status: upstream.status,
      body: sanitized,
      type: contentType,
      headers: { ...CORS, "Cache-Control": "no-cache" },
    };
  } catch (err) {
    return {
      status: 502,
      body: err instanceof Error ? err.message : "proxy failed",
      type: "text/plain",
      headers: CORS,
    };
  }
}
