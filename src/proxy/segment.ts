import zlib from "node:zlib";

const TSGZ = [84, 73, 75, 84, 73, 75, 84, 83, 71, 90]; // TIKTIKTSGZ
const TRAW = [84, 73, 75, 84, 73, 75, 82, 65, 87];     // TIKTIKRAW
const TPIX = [84, 73, 75, 84, 73, 75, 80, 88];         // TIKTIKPX

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function webpExifTS(bytes: Buffer): Buffer | null {
  if (bytes.length < 16) return null;
  const ascii = (i: number, n: number) => bytes.subarray(i, i + n).toString("latin1");
  if (ascii(0, 4) !== "RIFF" || ascii(8, 4) !== "WEBP") return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 12;
  while (off + 8 <= bytes.length) {
    const tag = ascii(off, 4);
    const n = dv.getUint32(off + 4, true);
    off += 8;
    if (n < 0 || off + n > bytes.length) return null;
    if (tag === "EXIF") {
      const data = bytes.subarray(off, off + n);
      if (data.length >= 188 && data[0] === 0x47 && data[188] === 0x47) return data;
      return null;
    }
    off += n + (n & 1);
  }
  return null;
}

function pngIendTS(bytes: Buffer): Buffer | null {
  if (bytes.length < 16 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 8;
  while (off + 8 <= bytes.length) {
    const len = dv.getUint32(off);
    if (len > bytes.length - off - 12) return null;
    const type = bytes.subarray(off + 4, off + 8).toString("latin1");
    off += 8 + len + 4;
    if (type === "IEND") {
      if (off < bytes.length && bytes[off] === 0x47 && off + 188 < bytes.length && bytes[off + 188] === 0x47) {
        return bytes.subarray(off);
      }
      return null;
    }
  }
  return null;
}

function pngRGB(bytes: Buffer): Buffer | null {
  if (bytes.length < 8 || bytes[0] !== 0x89 || bytes[1] !== 0x50) return null;
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 8;
  let w = 0;
  let h = 0;
  let depth = 0;
  let ctype = 0;
  let interlace = 0;
  const idats: Buffer[] = [];

  while (off + 8 <= bytes.length) {
    const len = dv.getUint32(off);
    if (len > bytes.length - off - 12) return null;
    const type = bytes.subarray(off + 4, off + 8).toString("latin1");
    const data = bytes.subarray(off + 8, off + 8 + len);
    if (type === "IHDR") {
      const hd = new DataView(data.buffer, data.byteOffset, data.byteLength);
      w = hd.getUint32(0);
      h = hd.getUint32(4);
      depth = data[8];
      ctype = data[9];
      interlace = data[12];
    } else if (type === "IDAT") {
      idats.push(data);
    } else if (type === "IEND") {
      break;
    }
    off += 12 + len;
  }

  if (!w || !h || depth !== 8 || interlace || (ctype !== 2 && ctype !== 6)) return null;

  try {
    const zbuf = Buffer.concat(idats);
    const raw = zlib.inflateSync(zbuf);
    const bpp = ctype === 6 ? 4 : 3;
    const stride = w * bpp;
    const rgb = Buffer.allocUnsafe(w * h * 3);
    let src = 0;
    let dst = 0;
    let prev = Buffer.alloc(stride);

    for (let y = 0; y < h; y++) {
      if (src + 1 + stride > raw.length) return null;
      const filter = raw[src++];
      const row = raw.subarray(src, src + stride);
      src += stride;
      const recon = Buffer.allocUnsafe(stride);

      for (let i = 0; i < stride; i++) {
        const a = i >= bpp ? recon[i - bpp] : 0;
        const b = prev[i];
        const c = i >= bpp ? prev[i - bpp] : 0;
        let v = row[i];
        if (filter === 1) v += a;
        else if (filter === 2) v += b;
        else if (filter === 3) v += (a + b) >> 1;
        else if (filter === 4) v += paeth(a, b, c);
        else if (filter !== 0) return null;
        recon[i] = v & 255;
      }

      if (ctype === 2) {
        recon.copy(rgb, dst);
        dst += stride;
      } else {
        for (let i = 0; i < stride; i += 4) {
          rgb[dst++] = recon[i];
          rgb[dst++] = recon[i + 1];
          rgb[dst++] = recon[i + 2];
        }
      }
      prev = recon;
    }
    return rgb;
  } catch {
    return null;
  }
}

function unwrapPixels(bytes: Buffer): Buffer | null {
  const rgb = pngRGB(bytes);
  if (!rgb || rgb.length < 12) return null;
  for (let k = 0; k < 8; k++) {
    if (rgb[k] !== TPIX[k]) return null;
  }
  const n = rgb.readUInt32BE(8);
  if (n <= 0 || 12 + n > rgb.length) return null;
  const gz = rgb.subarray(12, 12 + n);
  if (gz.length < 2 || gz[0] !== 0x1f || gz[1] !== 0x8b) return null;
  try {
    const ts = zlib.gunzipSync(gz);
    if (!ts.length || ts[0] !== 0x47) return null;
    return ts;
  } catch {
    return null;
  }
}

export function sanitizeSegmentBody(bytes: Buffer): Buffer {
  if (!bytes || !bytes.length) return bytes;

  // 1. Direct WebP Exif unwrapping
  const fromWebp = webpExifTS(bytes);
  if (fromWebp) return fromWebp;

  // 2. Direct PNG IEND appending
  const fromIend = pngIendTS(bytes);
  if (fromIend) return fromIend;

  // 3. PNG Pixel steganography (Used by DaddyLive Player 1 on TikTok CDN)
  const isPNG = bytes.length >= 8 && bytes[0] === 0x89 && bytes[1] === 0x50;
  if (isPNG) {
    const px = unwrapPixels(bytes);
    if (px) return px;
  }

  // 4. TRAW marker check
  for (let i = 0; i + TRAW.length < bytes.length; i++) {
    let hit = true;
    for (let j = 0; j < TRAW.length; j++) {
      if (bytes[i + j] !== TRAW[j]) {
        hit = false;
        break;
      }
    }
    if (hit) {
      const ts = bytes.subarray(i + TRAW.length);
      if (ts.length && ts[0] === 0x47) return ts;
    }
  }

  // 5. TSGZ compressed marker check
  for (let i = 0; i + TSGZ.length < bytes.length; i++) {
    let hit = true;
    for (let j = 0; j < TSGZ.length; j++) {
      if (bytes[i + j] !== TSGZ[j]) {
        hit = false;
        break;
      }
    }
    if (hit) {
      try {
        const ts = zlib.gunzipSync(bytes.subarray(i + TSGZ.length));
        if (ts.length && ts[0] === 0x47) return ts;
      } catch {}
    }
  }

  // 6. Direct sync byte scan
  for (let i = 0; i + 188 < bytes.length; i++) {
    if (bytes[i] === 0x47 && bytes[i + 188] === 0x47) {
      return bytes.subarray(i);
    }
  }

  return bytes;
}
