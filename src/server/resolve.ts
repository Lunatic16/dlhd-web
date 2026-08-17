import type { ServerResponse } from "node:http";

import { fetchChannelInfo, playerPageUrl, watchUrl } from "../channels/index.js";
import { fetchHtml } from "../http.js";
import { PLAYER_IDS, playerLabel, type ServerKind } from "../players/types.js";
import { buildMpvCommand, buildProxyUrl, buildVlcCommand } from "../proxy/links.js";
import { extractEmbedUrl } from "../resolver/extractors/dlhd-page.js";
import { htmlMayContainPlayable } from "../resolver/extractors/embed.js";
import { resolveFromHtml } from "../resolver/resolve.js";
import type { ResolvedStream } from "../resolver/types.js";
import { fetchEmbedHtmlChain } from "./fetch.js";

export type ServerExport = {
  server: ServerKind;
  label: string;
  title: string;
  direct: string;
  proxied: string;
  vlc: string;
  mpv: string;
  isHls: boolean;
  ms: number;
  duplicateOf?: ServerKind;
  duplicateLabel?: string;
};

type ResolveSession = {
  cache: Map<string, ResolvedStream>;
  sourceByEmbed: Map<string, ServerKind>;
};

function toServerExport(
  resolved: ResolvedStream,
  channelName: string,
  origin: string,
  ms: number,
  duplicateOf?: ServerKind,
): ServerExport {
  const title = `${channelName} · ${playerLabel(resolved.server)}`;
  const direct = resolved.playableUrl;
  return {
    server: resolved.server,
    label: playerLabel(resolved.server),
    title,
    direct,
    proxied: buildProxyUrl(direct, resolved.embedUrl, origin),
    vlc: buildVlcCommand(direct, resolved.embedUrl),
    mpv: buildMpvCommand(direct, resolved.embedUrl, title),
    isHls: resolved.mimeType === "application/x-mpegURL",
    ms,
    duplicateOf,
    duplicateLabel: duplicateOf ? playerLabel(duplicateOf) : undefined,
  };
}

function resolveErrorMessage(err: unknown, server: ServerKind): string {
  const msg = err instanceof Error ? err.message : "failed";
  if (server === "cast" && msg.includes("403")) {
    return "cast embed blocked by CDN (HTTP 403)";
  }
  if (msg.startsWith("fetch failed (HTTP ")) {
    return msg.replace(/^fetch failed \(HTTP (\d+)\): https?:\/\/[^\s]+/, "upstream fetch failed (HTTP $1)");
  }
  return msg;
}

function sendEvent(res: ServerResponse, event: string, data: unknown) {
  res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

export async function resolveLive(
  channelId: number,
  server: ServerKind,
  session?: ResolveSession,
): Promise<{ resolved: ResolvedStream; duplicateOf?: ServerKind }> {
  const referer = watchUrl(channelId);
  const pageUrl = playerPageUrl(server, channelId);
  const embedUrl = extractEmbedUrl(await fetchHtml(pageUrl, referer));
  if (!embedUrl) {
    throw new Error(`no embed iframe on ${server} page`);
  }
  const duplicateOf = session?.sourceByEmbed.get(embedUrl);
  const cached = session?.cache.get(embedUrl);
  if (cached) {
    return {
      resolved: { ...cached, channelId, server },
      duplicateOf,
    };
  }
  const { html: embedHtml, referer: streamReferer } = await fetchEmbedHtmlChain(
    embedUrl,
    await fetchHtml(embedUrl, pageUrl),
    htmlMayContainPlayable,
  );
  const resolved = await resolveFromHtml(embedHtml, {
    channelId,
    server,
    embedUrl: streamReferer,
  });
  session?.cache.set(embedUrl, resolved);
  session?.sourceByEmbed.set(embedUrl, server);
  return { resolved, duplicateOf: undefined };
}

export async function handleResolveLive(res: ServerResponse, channelId: number, origin: string) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    "Access-Control-Allow-Origin": "*",
  });
  const channel = await fetchChannelInfo(channelId);
  sendEvent(res, "channel", channel);
  const session: ResolveSession = { cache: new Map(), sourceByEmbed: new Map() };
  for (const server of PLAYER_IDS) {
    sendEvent(res, "start", { server });
    const started = Date.now();
    try {
      const { resolved, duplicateOf } = await resolveLive(channelId, server, session);
      sendEvent(res, "found", toServerExport(resolved, channel.name, origin, Date.now() - started, duplicateOf));
    } catch (err) {
      sendEvent(res, "fail", {
        server,
        label: playerLabel(server),
        error: resolveErrorMessage(err, server),
        ms: Date.now() - started,
      });
    }
  }
  sendEvent(res, "done", { channelId, channel, servers: PLAYER_IDS });
  res.end();
}
