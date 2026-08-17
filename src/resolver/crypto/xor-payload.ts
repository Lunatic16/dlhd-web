export function xorDecryptBase64Payload(b64: string, key: string): string {
  const raw = Buffer.from(b64, "base64").toString("binary");
  return [...raw]
    .map((ch, i) => String.fromCharCode(ch.charCodeAt(0) ^ key.charCodeAt(i % key.length)))
    .join("");
}

export function xorDecryptBase64Json<T>(b64: string, key: string): T {
  return JSON.parse(xorDecryptBase64Payload(b64, key)) as T;
}
