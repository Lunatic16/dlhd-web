import { PLAYERS } from "../players/types.js";

const SITE_TITLE = "DaddyLive Stream HLS Resolver";
const SITE_DESC =
  "Resolve DaddyLive streams to direct HLS and WebM URLs, proxy with embed referer, play in-browser, and copy VLC or MPV commands.";

function esc(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function renderPage(): string {
  const config = JSON.stringify({ players: PLAYERS }).replace(/</g, "\\u003c");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="description" content="${esc(SITE_DESC)}">
<meta name="robots" content="index,follow">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(SITE_TITLE)}">
<meta property="og:description" content="${esc(SITE_DESC)}">
<meta name="twitter:card" content="summary">
<meta name="twitter:title" content="${esc(SITE_TITLE)}">
<meta name="twitter:description" content="${esc(SITE_DESC)}">
<title>${esc(SITE_TITLE)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/style.css">
<script src="https://cdn.jsdelivr.net/npm/hls.js@1.5.15/dist/hls.min.js"></script>
</head>
<body>
<main class="app">
<header class="top">
<div class="top__badge"><span class="top__badge-dot"></span> DLHD Live Engine</div>
<h1 class="top__title">${esc(SITE_TITLE)}</h1>
<p class="top__desc">Stream 24/7 TV channels directly with referer-bypass HLS proxying, player failovers, and low-latency playback.</p>
</header>

<section class="card card--glass" aria-labelledby="resolve-heading">
<h2 id="resolve-heading" class="visually-hidden">Resolve channel</h2>
<form id="watch-form">
<div class="resolve__form-grid">
<label class="resolve__field">
<span class="resolve__label">Filter Channels</span>
<div class="input-wrapper">
<svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
<input id="channel-search" type="search" placeholder="Search by name or ID..." autocomplete="off">
</div>
</label>
<label class="resolve__field resolve__field--grow">
<span class="resolve__label">Select Channel</span>
<div class="input-wrapper">
<svg class="input-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="7" width="20" height="15" rx="2" ry="2"></rect><polyline points="17 2 12 7 7 2"></polyline></svg>
<select id="channel-select" required aria-describedby="resolve-hint">
<option value="" disabled selected>Loading channels...</option>
</select>
</div>
</label>
<button type="button" id="resolve-btn">
<span>Resolve Stream</span>
<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>
</button>
</div>
<p id="resolve-hint" class="resolve__hint">PLAYER 1–7 match DLHD watch servers. Click badges below to switch stream players.</p>
</form>
<p id="error" class="msg--err" hidden role="alert"></p>
</section>

<section id="result" class="stack" hidden aria-live="polite">
<article class="card">
<h2 id="stream-title" class="stream-title">Stream</h2>
<div class="player">
<video id="video" controls playsinline></video>
</div>
</article>

<article class="card" id="servers-card" hidden>
<h2 class="section-title">Players</h2>
<div id="servers" class="servers" role="group" aria-label="Available players"></div>
</article>

<article class="card">
<h2 class="section-title">Export</h2>
<ul class="exports">
<li>
<div class="export__meta">
<span class="export__name">Direct URL</span>
<span class="export__hint">Upstream stream URL from embed page</span>
</div>
<div class="export__row">
<input id="direct" readonly aria-label="Direct stream URL">
<button type="button" data-copy="direct">Copy</button>
</div>
</li>
<li>
<div class="export__meta">
<span class="export__name">Proxied URL</span>
<span class="export__hint">Through this server with embed referer headers</span>
</div>
<div class="export__row">
<input id="proxy" readonly aria-label="Proxied stream URL">
<button type="button" data-copy="proxy">Copy</button>
</div>
</li>
<li>
<div class="export__meta">
<span class="export__name">VLC</span>
<span class="export__hint">Direct URL with embed --http-referrer</span>
</div>
<div class="export__row">
<input id="vlc" readonly aria-label="VLC command">
<button type="button" data-copy="vlc">Copy</button>
</div>
</li>
<li>
<div class="export__meta">
<span class="export__name">MPV</span>
<span class="export__hint">Direct URL with embed --referrer</span>
</div>
<div class="export__row">
<input id="mpv" readonly aria-label="MPV command">
<button type="button" data-copy="mpv">Copy</button>
</div>
</li>
</ul>
</article>
</section>
</main>
<script type="application/json" id="app-config">${config}</script>
<script type="module" src="/app.js"></script>
</body>
</html>`;
}
