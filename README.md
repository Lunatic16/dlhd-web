<div align="center">

# 📺 DaddyLive Stream HLS Resolver

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-20%2B-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-blue?logo=docker&logoColor=white)](https://www.docker.com/)

**High-performance, referer-aware DaddyLive (DLHD) stream engine & dynamic IPTV playlist provider.**

Resolves DaddyLive player embeds to direct **HLS (`.m3u8`)** & **WebM** streams, proxies traffic with referer bypass headers, provides dynamic IPTV playlist generation (`.m3u8`), handles steganographic and obfuscated segment decoding, and enables single-click **VLC** / **MPV** stream exports.

[Quick Start](#-quick-start) • [Dynamic IPTV Playlist](#-dynamic-iptv-playlist) • [Streaming Engine & Relay Pipeline](#-streaming-engine--relay-pipeline) • [HTTP API](#-http-api) • [Docker Deployment](#-running-with-docker) • [Architecture](#-architecture)

</div>

---

## ⚡ Features

- 🍿 **7 Multi-Player Failovers** — Automatically resolves across 7 DLHD player embeds (`stream`, `cast`, `watch`, `plus`, `casting`, `player`, `hub`).
- 🔓 **PNG Pixel Steganography Unpacker** — Automatically decodes and defilters compressed MPEG-TS video packets hidden within TikTok/CDN PNG image files (`TIKTIKPX`, `TIKTIKTSGZ`, `TIKTIKRAW`), ensuring pristine playback with zero scrambled data.
- 🧩 **Zero-Browser `_econfig` Decryption** — Pure cryptographic reverse-engineering of Player 2 (`assetrage`) 4-part permutation array slicing without requiring headless browser overhead.
- 🛡️ **Anti-Poison Playlist Guard** — Validates upstream playlists to reject anti-bot honeypots, tracking pixel redirects, and empty error manifests.
- ⏱️ **Live Sliding Window Synchronization** — Trims incomplete tail chunks using `#EXT-X-TARGETDURATION` to eliminate buffer stalls and audio warps.
- 📻 **Dynamic IPTV M3U8 Playlist** — Serves standard IPTV playlists (`GET /playlist.m3u8`) compatible with **VLC**, **TiviMate**, **Kodi**, **IPTV Smarters**, **Dispatcharr**, and **Jellyfin**.
- 🔄 **On-Demand Stream Resolver** — Redirects (`GET /api/stream/{channelId}.m3u8`) media players on-demand with live tokens.
- 🛡️ **Referer Bypass Proxy & TLS Impersonation** — Seamlessly proxies HLS master & segment playlists while injecting required upstream embed headers and browser TLS fingerprints.
- 🖥️ **Modern Web Interface** — Sleek dark UI with live SSE progress tracking, search filtering, and one-click VLC/MPV command builders.

---

## 🚀 Quick Start

### Prerequisites

- **Node.js**: `v20.0.0` or higher
- **npm**: `v9.0.0` or higher

### Local Setup

```bash
# 1. Clone repository
git clone https://github.com/Lunatic16/dlhd-web.git
cd dlhd-web

# 2. Install dependencies & build
npm install

# 3. Start server
npm start
```

> [!TIP]
> The server will start on `http://localhost:3000`. You can pass `PORT=8080 npm start` to bind a custom port.

---

## 🔬 Streaming Engine & Relay Pipeline

`dlhd-web` includes a specialized HLS proxy and unpacking engine designed to defeat aggressive CDN anti-scraping and disguise tactics:

### 1. Steganographic MPEG-TS Segment Unpacking (`src/proxy/segment.ts`)
Many DaddyLive CDN nodes (such as Player 1 hosting on TikTok CDN) disguise MPEG-TS video streams as valid PNG image files:
- **Scanline Reconstruction**: De-filters PNG image scanlines using None, Sub, Up, Average, and Paeth algorithms.
- **Payload Extraction**: Identifies the `TIKTIKPX` header, reads payload length boundaries, and inflates the underlying gzip stream.
- **Packet Alignment**: Validates `0x47` sync bytes at 188-byte intervals, guaranteeing strictly aligned transport stream packets for VLC, MPV, and MSE browsers.
- Also supports WebP EXIF encapsulation, PNG `IEND` sync scanning, `TIKTIKTSGZ`, and `TIKTIKRAW` markers.

### 2. Upstream Playlist Verification (`src/proxy/media.ts`)
- Sniffs MIME types and media signatures (`#EXTM3U`, MPEG-TS, WebM).
- Rejects poison playlists containing only static images or empty error markers.

### 3. Dual-Engine HTTP Client with TLS Impersonation (`src/http.ts`)
- Employs Chrome TLS fingerprint impersonation (`impit`) with automatic failover to prevent Cloudflare and CDN HTTP 403 blocks.

---

## 📺 Dynamic IPTV Playlist

Integrate all 24/7 channels directly into your favorite IPTV app or media client:

> **M3U Playlist URL:**  
> `http://localhost:3000/playlist.m3u8`

### Playlist Capabilities:
- Includes formatted `#EXTINF` tags: `tvg-id`, `tvg-name`, and `group-title="DaddyLive 24/7"`.
- Each channel routes to `/api/stream/{channelId}.m3u8`, which dynamically negotiates live embed tokens and proxies the HLS stream on player request.
- Compatible with **TiviMate**, **VLC**, **Kodi**, **IPTV Smarters**, **Plex / Jellyfin (xTeVe/Threadfin)**.

---

## 🐳 Running with Docker

### Using Docker Compose (Recommended)

```bash
docker compose up -d
```

### Using Docker CLI

```bash
# Build image
docker build -t daddylive-stream-resolver .

# Run container
docker run -d -p 3000:3000 --name daddylive-resolver daddylive-stream-resolver
```

---

## 🌐 Using the Web UI

The home page is a responsive single-screen stream dashboard:

1. **Select / Filter**: Search channels by name or ID in the top input.
2. **Resolve**: Click **Resolve Stream**. The server will sequentially query players 1 through 7 via Server-Sent Events (SSE).
3. **Playback & Switch**: Playback starts automatically on the first valid stream. Tap any server badge to switch players.
4. **Export**: Grab direct URLs, proxied URLs, or copy ready-to-run VLC / MPV terminal commands.

---

## 🎯 Player Endpoints

Each UI player corresponds to a DaddyLive embed provider:

| UI Label | Internal ID | DLHD Path | Upstream Engine / Status |
| --- | --- | --- | --- |
| **PLAYER 1** | `stream` | `/stream/stream-{id}.php` | Primary edge HLS with PNG pixel steganography unpacking |
| **PLAYER 2** | `cast` | `/cast/stream-{id}.php` | Assetrage player with pure `_econfig` decryption |
| **PLAYER 3** | `watch` | `/watch/stream-{id}.php` | Secondary HLS stream (`daddy3.php` mirror) |
| **PLAYER 4** | `plus` | `/plus/stream-{id}.php` | Plus player with XOR + charCode deobfuscation |
| **PLAYER 5** | `casting` | `/casting/stream-{id}.php` | Casting player (`wikisport` / `instreams` / `cdnlivetv`) |
| **PLAYER 6** | `player` | `/player/stream-{id}.php` | Blogger redirect embed player |
| **PLAYER 7** | `hub` | `/hub/stream-{id}.php` | Livelive24 / WebM player with dynamic API token fetching |

---

## 📡 HTTP API

All endpoints respond to **`GET`** requests:

| Endpoint | Content-Type | Description |
| --- | --- | --- |
| `GET /` | `text/html` | Main Web UI Application |
| `GET /playlist.m3u8` | `application/vnd.apple.mpegurl` | Dynamic IPTV playlist containing all 24/7 channels |
| `GET /api/stream/{channelId}.m3u8` | `HTTP 302 Redirect` | Resolves channel on-demand and redirects to proxied stream |
| `GET /api/channels` | `application/json` | JSON list of available channels (`{ id, name }`) |
| `GET /api/resolve/live?channel={id}` | `text/event-stream` | Real-time SSE stream resolving all 7 players |
| `GET /api/proxy?url={url}&referer={ref}` | `stream/octet` | Proxies HLS manifests & unpacks segments with referer headers |

---

## 🏗️ Architecture

```mermaid
flowchart LR
  subgraph UI [Web UI]
    Page[page.ts]
    App[app.ts]
  end

  subgraph Scraper [Scraper Engine]
    Channels[channels/fetch]
    Fetch[server/fetch]
    Http[http.ts (Chrome TLS)]
  end

  subgraph Resolver [Resolver Core]
    Extract[extractors/embed]
    Crypto[crypto/*]
    Assetrage[extractors/assetrage]
    Hub[extractors/hub]
  end

  subgraph Server [HTTP Server]
    Routes[index.ts]
    Live[resolve.ts]
    Proxy[proxy/stream]
    Media[proxy/media]
    Segment[proxy/segment (Steganography Unpacker)]
    Playlist[channels/m3u8]
  end

  DLHD[(DLHD Base)] -->|HTML| Http
  Http --> Channels
  Http --> Fetch
  Fetch -->|Embed HTML| Extract
  Extract --> Crypto
  Extract --> Assetrage
  Extract --> Hub
  Live --> Fetch
  Live --> Extract
  App -->|SSE| Live
  App -->|GET| Channels
  Routes --> Page
  Routes --> Live
  Routes --> Proxy
  Proxy --> Media
  Proxy --> Segment
  Routes --> Playlist
```

---

## 📁 Project Layout

```
src/
├── channels/       # Channel catalog scrapers & M3U8 playlist generators
├── players/        # Player definitions & labels (PLAYER 1–7)
├── proxy/          # Referer-aware HLS proxy, poison guard, & segment unpacker
│   ├── media.ts    # Sniffing & poison playlist detection
│   ├── segment.ts  # PNG steganography / WebP Exif / 188-byte TS packet alignment
│   ├── stream.ts   # Sliding window live HLS sync & stream proxy
│   └── links.ts    # VLC & MPV command builders
├── resolver/       # Pure HTML extractors & decryption algorithms
│   ├── crypto/     # Base64, XOR, AES-CBC, and ad-config decryptors
│   └── extractors/ # Individual player embed parsers (assetrage, hub, plus, etc.)
├── server/         # Node.js HTTP server & SSE route handlers
├── web/            # Single-page web app (HTML, TS, CSS)
├── config.ts       # Global settings (DLHD_BASE)
└── index.ts        # Library barrel exports
```

---

## ⚙️ Configuration

Environment variables:

| Variable | Default Value | Description |
| --- | --- | --- |
| `PORT` | `3000` | HTTP server listening port |
| `DLHD_BASE` | `https://dlhd.st` | Upstream DaddyLive domain base |

---

## 🛠️ Development

```bash
# Run TypeScript compilation & static asset sync
npm run build

# Type check codebase
npm run typecheck

# Build and start server
npm start
```

---

## 📄 Legal Notice

This software is for personal educational and research purposes only. All stream content belongs to their respective owners. The maintainers are not affiliated with DaddyLive or DLHD.
