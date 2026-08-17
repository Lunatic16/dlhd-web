import { extractEmbedUrl } from "./extractors/dlhd-page.js";
import { extractPlayableFromHtml } from "./extractors/embed.js";
import type { ResolvedStream, ServerKind } from "./types.js";

export type ResolveContext = {
  channelId: number;
  server: ServerKind;
  embedUrl: string;
};

export async function resolveFromHtml(
  embedHtml: string,
  ctx: ResolveContext,
): Promise<ResolvedStream> {
  const resolved = await extractPlayableFromHtml(embedHtml);
  if (!resolved) {
    throw new Error(`no playable stream in ${ctx.server} embed`);
  }
  return { ...ctx, ...resolved };
}

export function resolveEmbedFromDlhdPage(
  dlhdHtml: string,
  embedHtml: string,
  channelId: number,
  server: ServerKind,
): Promise<ResolvedStream> {
  const embedUrl = extractEmbedUrl(dlhdHtml);
  if (!embedUrl) {
    throw new Error(`embed iframe not found for channel ${channelId} server ${server}`);
  }
  return resolveFromHtml(embedHtml, { channelId, server, embedUrl });
}
