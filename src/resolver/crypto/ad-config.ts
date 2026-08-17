import { extractXorPayload } from "../extractors/dlhd-page.js";
import type { AdBlockConfig } from "../types.js";
import { xorDecryptBase64Json } from "./xor-payload.js";

const PLAIN_PREFIX = '{"adserverDomain":"';

function deriveRepeatingXorKey(cipher: Buffer, plainPrefix: string): string | null {
  if (cipher.length < plainPrefix.length) return null;
  const keyBytes = [...plainPrefix].map((ch, i) => cipher[i] ^ ch.charCodeAt(0));
  for (let period = 1; period <= keyBytes.length; period++) {
    let ok = true;
    for (let i = period; i < keyBytes.length; i++) {
      if (keyBytes[i] !== keyBytes[i % period]) {
        ok = false;
        break;
      }
    }
    if (ok) return String.fromCharCode(...keyBytes.slice(0, period));
  }
  return null;
}

export function decryptAdBlockConfig(html: string, b64?: string): AdBlockConfig | null {
  const payload = b64 ?? extractXorPayload(html);
  if (!payload) return null;
  const key = deriveRepeatingXorKey(Buffer.from(payload, "base64"), PLAIN_PREFIX);
  if (!key) return null;
  try {
    return xorDecryptBase64Json<AdBlockConfig>(payload, key);
  } catch {
    return null;
  }
}
