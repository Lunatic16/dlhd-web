import { aesCbcDecrypt } from "../crypto/aes-cbc.js";
import type { HubConfig } from "../types.js";

const ENCRYPTED_BLOCK_RE =
  /const ENCRYPTED_CONFIG = \{[\s\S]*?cipher:\s*'([^']+)'[\s\S]*?key:\s*'([^']+)'[\s\S]*?iv:\s*'([^']+)'/;

export async function decryptHubConfigFromHtml(html: string): Promise<HubConfig | null> {
  const match = html.match(ENCRYPTED_BLOCK_RE);
  if (!match) return null;
  const [, cipher, key, iv] = match;
  const json = await aesCbcDecrypt(cipher, key, iv);
  const config = JSON.parse(json) as HubConfig;
  if (!config.baseUrl || !config.streamId) return null;
  return config;
}

export function buildHubPlayableUrl(config: HubConfig): string | null {
  if (config.initialVideoUrl) return config.initialVideoUrl;
  if (config.initialToken && config.initialCode && config.streamId) {
    return `${config.baseUrl}/${config.initialToken}/${config.initialCode}/${config.streamId}/webm/`;
  }
  return null;
}
