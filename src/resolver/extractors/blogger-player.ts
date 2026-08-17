export function extractBloggerZdecUrl(html: string): string | null {
  const zdec = html.match(/zdec\s*=\s*"([^"]+)"/)?.[1];
  if (!zdec) return null;
  const script = Buffer.from(zdec, "base64").toString("utf8");
  const inner = script.match(/atob\('([^']+)'\)/)?.[1];
  if (!inner) return null;
  const url = Buffer.from(inner, "base64").toString("utf8").trim();
  return url.startsWith("http") ? url : null;
}

export function isBloggerPlayerPage(url: string): boolean {
  return url.includes("blogspot.com");
}
