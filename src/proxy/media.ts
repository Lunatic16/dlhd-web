const NON_MEDIA_EXT = /\.(html|php|js|css|svg)(\?|$)/i;
const STATIC_IMAGE_EXT = /\.(jpg|jpeg|png|gif|webp)(\?|$)/i;
const STREAM_EXT = /\.(m3u8|ts|m4s|mp4)(\?|$)/i;

export type MediaKind = {
  kind: "empty" | "playlist" | "segment" | "binary";
  master?: boolean;
  media?: boolean;
  text?: string;
};

export function sniffMedia(body: Buffer): MediaKind {
  if (!body || !body.length) return { kind: "empty" };

  const sample = body.subarray(0, Math.min(body.length, 16384));
  const text = sample.toString("utf8");

  if (text.includes("#EXTM3U")) {
    const hasStreamInf = /#EXT-X-STREAM-INF/i.test(text);
    const hasExtinf = /#EXTINF:/i.test(text);
    return {
      kind: "playlist",
      master: hasStreamInf && !hasExtinf,
      media: hasExtinf,
      text,
    };
  }

  // MPEG-TS sync byte 0x47
  if (body[0] === 0x47 && body.length >= 188) return { kind: "segment" };
  // Prepending fake PNG header check (\x89PNG)
  if (body.length >= 8 && body[0] === 0x89 && body[1] === 0x50 && body[2] === 0x4e && body[3] === 0x47) {
    return { kind: "segment" };
  }

  return { kind: "binary" };
}

export function isM3u8Resource(url: string, contentType = ""): boolean {
  const ct = String(contentType).toLowerCase();
  if (ct.includes("mpegurl") || ct.includes("m3u8")) return true;
  try {
    const path = new URL(url).pathname.toLowerCase();
    return path.endsWith(".m3u8") || path.includes(".m3u8?");
  } catch {
    return false;
  }
}

function playlistResourceLines(text: string): string[] {
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    lines.push(line);
  }
  return lines;
}

function uriLooksLikeVariant(uri: string): boolean {
  if (/\.m3u8(\?|$)/i.test(uri)) return true;
  if (!/^https?:\/\//i.test(uri)) return !NON_MEDIA_EXT.test(uri);
  return false;
}

function uriLooksLikeStaticAsset(uri: string): boolean {
  return STATIC_IMAGE_EXT.test(uri);
}

function uriLooksLikeMediaSegment(uri: string): boolean {
  if (NON_MEDIA_EXT.test(uri)) return false;
  if (STREAM_EXT.test(uri)) return true;
  if (!/^https?:\/\//i.test(uri)) return true;
  return !NON_MEDIA_EXT.test(uri);
}

export function isPoisonPlaylist(body: Buffer): boolean {
  const sniff = sniffMedia(body);
  if (sniff.kind !== "playlist" || !sniff.text) return false;
  const resources = playlistResourceLines(sniff.text);
  if (!resources.length) return false;
  if (sniff.master) {
    if (resources.some(uriLooksLikeVariant)) return false;
    return resources.every(uriLooksLikeStaticAsset);
  }
  if (sniff.media) return !resources.some(uriLooksLikeMediaSegment);
  return false;
}

export function isPlayablePlaylist(body: Buffer): boolean {
  const sniff = sniffMedia(body);
  if (sniff.kind !== "playlist" || !sniff.text || isPoisonPlaylist(body)) return false;
  const resources = playlistResourceLines(sniff.text);
  if (sniff.master) return resources.some(uriLooksLikeVariant);
  if (sniff.media) return resources.some(uriLooksLikeMediaSegment);
  return true;
}

export function okBody(body: Buffer, url: string): boolean {
  if (!body?.length) return false;
  const head = body.toString("utf8", 0, 200).toLowerCase();
  if (head.includes("<html") || head.includes("403 forbidden")) return false;
  const sniff = sniffMedia(body);
  if (isM3u8Resource(url) || sniff.kind === "playlist") {
    return isPlayablePlaylist(body) && !isPoisonPlaylist(body);
  }
  return sniff.kind === "segment" || sniff.kind === "binary";
}
