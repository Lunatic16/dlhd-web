import { DLHD_BASE } from "../config.js";
import type { ServerKind } from "../players/types.js";

export function watchUrl(channelId: number): string {
  return `${DLHD_BASE}/watch.php?id=${channelId}`;
}

export function playerPageUrl(player: ServerKind, channelId: number): string {
  return `${DLHD_BASE}/${player}/stream-${channelId}.php`;
}
