import type { ServerKind } from "../players/types.js";

export type { ServerKind };

export type ResolvedStream = {
  channelId: number;
  server: ServerKind;
  embedUrl: string;
  playableUrl: string;
  mimeType: "application/x-mpegURL" | "video/webm";
  meta: Record<string, string>;
};

export type HubConfig = {
  apiUrl: string;
  baseUrl: string;
  streamId: string;
  initialToken?: string;
  initialCode?: string;
  initialVideoUrl?: string;
};

export type AdBlockConfig = {
  adserverDomain: string;
  cdnDomain: string;
  selPath: string;
  adbVersion: string;
};
