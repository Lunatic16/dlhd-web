import { createServer, type ServerResponse } from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { proxyStream } from "../proxy/stream.js";
import { renderPage } from "../web/page.js";
import { handleChannelList, handlePlaylist, handleStreamResolver } from "./channels.js";
import { handleResolveLive } from "./resolve.js";


const PORT = Number(process.env.PORT ?? "3000");

const webRoot = [
  join(dirname(fileURLToPath(import.meta.url)), "../web"),
  join(process.cwd(), "src/web"),
].find((path) => existsSync(join(path, "style.css")))!;

const staticFiles: Record<string, [string, string]> = {
  "/style.css": ["style.css", "text/css; charset=utf-8"],
  "/app.js": ["app.js", "application/javascript; charset=utf-8"],
};

function send(
  res: ServerResponse,
  status: number,
  body: string | Buffer,
  contentType: string,
  extra?: Record<string, string>,
) {
  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  res.writeHead(status, { "Content-Type": contentType, "Content-Length": buf.byteLength, ...extra });
  res.end(buf);
}

createServer(async (req, res) => {
  try {
    if (req.method !== "GET") {
      send(res, 405, "method not allowed", "text/plain");
      return;
    }
    const proto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim() ?? "http";
    const host = (req.headers["x-forwarded-host"] as string | undefined)?.split(",")[0]?.trim() ?? req.headers.host ?? "localhost";
    const url = new URL(req.url ?? "/", `${proto}://${host}`);
    if (url.pathname === "/api/proxy") {
      const result = await proxyStream(url.searchParams, url.origin);
      send(res, result.status, result.body, result.type, result.headers);
      return;
    }
    if (url.pathname === "/api/channels") {
      await handleChannelList(res);
      return;
    }
    if (url.pathname === "/playlist.m3u8") {
      await handlePlaylist(res, url.origin);
      return;
    }
    const streamMatch = url.pathname.match(/^\/api\/stream\/(\d+)\.m3u8$/);
    if (streamMatch) {
      const channelId = Number(streamMatch[1]);
      await handleStreamResolver(res, channelId, url.origin);
      return;
    }

    if (url.pathname === "/api/resolve/live") {
      const channelId = Number(url.searchParams.get("channel"));
      if (!Number.isFinite(channelId) || channelId < 1) {
        send(res, 400, "channel required", "text/plain");
        return;
      }
      await handleResolveLive(res, channelId, url.origin);
      return;
    }
    const asset = staticFiles[url.pathname];
    if (asset) {
      send(res, 200, readFileSync(join(webRoot, asset[0])), asset[1]);
      return;
    }
    if (url.pathname === "/" || url.pathname === "/index.html") {
      send(res, 200, renderPage(), "text/html; charset=utf-8");
      return;
    }
    send(res, 404, "not found", "text/plain");
  } catch (err) {
    const message = err instanceof Error ? err.message : "error";
    send(res, 500, message, "text/plain");
  }
}).listen(PORT, () => {
  process.stdout.write(`listening on http://localhost:${PORT}\n`);
});
