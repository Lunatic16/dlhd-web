import { aesCbcDecrypt } from "../crypto/aes-cbc.js";
import { UA } from "../../http.js";
import type { HubConfig } from "../types.js";

const ENCRYPTED_BLOCK_RE =
  /const ENCRYPTED_CONFIG = \{[\s\S]*?cipher:\s*'([^']+)'[\s\S]*?key:\s*'([^']+)'[\s\S]*?iv:\s*'([^']+)'/;

export async function decryptHubConfigFromHtml(html: string): Promise<HubConfig | null> {
  const match = html.match(ENCRYPTED_BLOCK_RE);
  if (match) {
    const [, cipher, key, iv] = match;
    try {
      const json = await aesCbcDecrypt(cipher, key, iv);
      const config = JSON.parse(json) as HubConfig;
      if (config.baseUrl && config.streamId) return config;
    } catch {}
  }

  // Modern livelive24.com / hub player pattern
  const baseUrlMatch = html.match(/var baseUrl\s*=\s*["']([^"']+)["']/);
  const streamIdMatch = html.match(/var streamId\s*=\s*["']([^"']+)["']/);
  const apiUrlMatch = html.match(/var apiUrl\s*=\s*["']([^"']+)["']/);

  if (baseUrlMatch && streamIdMatch) {
    const baseUrl = baseUrlMatch[1].replace(/\\/g, "");
    const streamId = streamIdMatch[1];
    const apiUrl = apiUrlMatch ? apiUrlMatch[1].replace(/\\/g, "") : "";

    // Check if initial token/code exists in source tag
    const sourceMatch = html.match(/src="[^"]*\/([^/]+)\/([^/]+)\/[^/]+\/webm/);
    let initialToken = sourceMatch?.[1];
    let initialCode = sourceMatch?.[2];

    // If source has retry or missing, fetch dynamically from apiUrl
    if ((!initialToken || initialToken === "retry") && apiUrl) {
      try {
        const res = await fetch(`${apiUrl}?r=${Date.now()}`, {
          headers: {
            "User-Agent": UA,
            Accept: "application/json",
          },
        });
        if (res.ok) {
          const json: any = await res.json();
          if (json?.parsed_data?.token && json?.parsed_data?.code) {
            initialToken = json.parsed_data.token;
            initialCode = json.parsed_data.code;
          }
        }
      } catch {}
    }

    if (initialToken && initialCode) {
      return {
        apiUrl,
        baseUrl,
        streamId,
        initialToken,
        initialCode,
      };
    }
  }

  return null;
}

export function buildHubPlayableUrl(config: HubConfig): string | null {
  if (config.initialVideoUrl) return config.initialVideoUrl;
  if (config.initialToken && config.initialCode && config.streamId) {
    return `${config.baseUrl}/${config.initialToken}/${config.initialCode}/${config.streamId}/webm/?t=${Date.now()}`;
  }
  return null;
}
