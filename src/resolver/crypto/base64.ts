export function decodeBase64Binary(value: string): Buffer {
  return Buffer.from(value, "base64");
}
