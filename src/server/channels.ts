import type { ServerResponse } from "node:http";

import { fetchChannelList } from "../channels/fetch.js";
import { generateM3u8Playlist } from "../channels/m3u8.js";
import { PLAYER_IDS } from "../players/types.js";
import { buildProxyUrl } from "../proxy/links.js";
import { resolveLive } from "./resolve.js";

const JSON_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
};

export async function handleChannelList(res: ServerResponse) {
  const channels = await fetchChannelList();
  res.writeHead(200, JSON_HEADERS);
  res.end(JSON.stringify(channels));
}

export async function handlePlaylist(res: ServerResponse, origin: string) {
  const channels = await fetchChannelList();
  const playlistText = generateM3u8Playlist(channels, origin);
  res.writeHead(200, {
    "Content-Type": "application/vnd.apple.mpegurl; charset=utf-8",
    "Content-Disposition": 'attachment; filename="playlist.m3u8"',
    "Access-Control-Allow-Origin": "*",
    "Cache-Control": "no-cache",
  });
  res.end(playlistText);
}

export async function handleStreamResolver(res: ServerResponse, channelId: number, origin: string) {
  for (const server of PLAYER_IDS) {
    try {
      const { resolved } = await resolveLive(channelId, server);
      const proxiedUrl = buildProxyUrl(resolved.playableUrl, resolved.embedUrl, origin);
      res.writeHead(302, {
        Location: proxiedUrl,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache, no-store, must-revalidate",
      });
      res.end();
      return;
    } catch {
      // try next player
    }
  }

  res.writeHead(503, {
    "Content-Type": "text/plain; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
  });
  res.end(`Failed to resolve live stream for channel ${channelId}`);
}

