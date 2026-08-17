import { webcrypto } from "node:crypto";

import { decodeBase64Binary } from "./base64.js";

export async function aesCbcDecrypt(
  cipherB64: string,
  keyB64: string,
  ivB64: string,
): Promise<string> {
  const ciphertext = decodeBase64Binary(cipherB64);
  const key = decodeBase64Binary(keyB64);
  const iv = decodeBase64Binary(ivB64);
  const cryptoKey = await webcrypto.subtle.importKey("raw", key, { name: "AES-CBC" }, false, [
    "decrypt",
  ]);
  const plain = Buffer.from(
    await webcrypto.subtle.decrypt({ name: "AES-CBC", iv }, cryptoKey, ciphertext),
  );
  return plain.toString("utf8");
}
