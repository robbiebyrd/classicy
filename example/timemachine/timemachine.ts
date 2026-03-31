// This project is slightly adapted from the work of Rémi, an amazing
// developer who also loves retro computing.
// The source: https://github.com/remino/timeprox
// Rémi's website: https://remino.net

import http, { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const port: number = Number(process.env.TIMEMACHINE_PORT) || 8765;
const defaultTime: string = process.env.ARCHIVE_TIME || "19980101000000";
const prefix: string = process.env.URL_PREFIX || "https://web.archive.org/web";
const hostname = process.env.LISTENER || '0.0.0.0';
const cacheDir: string | undefined = process.env.CACHE_DIR;

if (cacheDir && !existsSync(cacheDir)) {
  mkdirSync(cacheDir, { recursive: true });
}

console.log({"options": {"port": port, "defaultTime": defaultTime, "prefix": prefix, "hostname": hostname, "cacheDir": cacheDir || "disabled"}})

// --- Cache ---

interface CacheEntry {
  contentType: string;
  archiveUrl: string;
  archiveTime: string;
  body: string;
  isHtml: boolean;
}

const cacheKey = (url: string, time: string): string =>
  createHash("sha256").update(`${time}:${url}`).digest("hex");

const cacheGet = (url: string, time: string): CacheEntry | null => {
  if (!cacheDir) return null;
  const file = join(cacheDir, `${cacheKey(url, time)}.json`);
  if (!existsSync(file)) return null;
  try {
    return JSON.parse(readFileSync(file, "utf-8")) as CacheEntry;
  } catch {
    return null;
  }
};

const cachePut = (url: string, time: string, entry: CacheEntry): void => {
  if (!cacheDir) return;
  const file = join(cacheDir, `${cacheKey(url, time)}.json`);
  writeFileSync(file, JSON.stringify(entry));
};

// --- URL rewriting ---

const arcUrl = (url: string, time: string): string =>
  `${prefix}/${time}/${url}`;

const rewriteArchiveLinks = (
  html: string,
  proxyBase: string,
  time: string,
): string =>
  html
    // Absolute archive.org URLs in <a> hrefs
    .replace(
      /(<a\b[^>]*\bhref\s*=\s*["'])https?:\/\/web\.archive\.org\/web\/\d{1,14}\/(https?:\/\/[^"']*)(["'])/gi,
      (_, before, originalUrl, after) =>
        `${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`,
    )
    // Relative /web/<timestamp>/<url> paths in <a> hrefs
    .replace(
      /(<a\b[^>]*\bhref\s*=\s*["'])\/web\/\d{1,14}\/(https?:\/\/[^"']*)(["'])/gi,
      (_, before, originalUrl, after) =>
        `${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`,
    );

const stripWaybackToolbar = (html: string, baseUrl: string): string =>
  html
    .replace(/^[\s\t\r\n]+</i, "<")
    .replace(
      /((?:<head[^>]*>))[\s\S]*?<!-- End Wayback Rewrite JS Include -->/i,
      "$1",
    )
    .replace(
      /((?:<html[^>]*>))[\s\S]*?<!-- End Wayback Rewrite JS Include -->/i,
      "$1",
    )
    .replace(
      /<!-- BEGIN WAYBACK TOOLBAR INSERT -->[\s\S]*?<!-- END WAYBACK TOOLBAR INSERT -->/gi,
      "",
    )
    .replace(/(<head[^>]*>)/i, `$1<base href="${baseUrl}">`);

// --- Server ---

const sendCached = (res: ServerResponse, entry: CacheEntry, targetUrl: string, time: string): void => {
  res.setHeader("Content-Type", entry.contentType);
  res.setHeader("X-Archive-Url", entry.archiveUrl);
  res.setHeader("X-Original-Url", targetUrl);
  res.setHeader("X-Cache", "HIT");
  if (entry.archiveTime) {
    res.setHeader("X-Archive-Time", entry.archiveTime);
  }

  if (entry.isHtml) {
    const proxyBase = `http://${hostname}:${port}`;
    const rewritten = rewriteArchiveLinks(entry.body, proxyBase, time);
    res.end(rewritten);
  } else {
    res.end(Buffer.from(entry.body, "base64"));
  }
};

const server = http.createServer(
  async (req: IncomingMessage, res: ServerResponse) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader(
      "Access-Control-Expose-Headers",
      "X-Archive-Url, X-Original-Url, X-Archive-Time, X-Cache",
    );

    if (req.method === "OPTIONS") {
      res.writeHead(204).end();
      return;
    }

    const reqUrl = new URL(req.url ?? "/", `http://localhost:${port}`);
    let targetUrl = reqUrl.searchParams.get("url");
    const time = reqUrl.searchParams.get("time") || defaultTime;

    // Unwrap nested proxy URLs — if the target is itself a TimeMachine URL,
    // extract the real url param from it
    if (targetUrl) {
      try {
        const nested = new URL(targetUrl);
        if (nested.port === String(port) && nested.searchParams.has("url")) {
          targetUrl = nested.searchParams.get("url");
        }
      } catch { /* not a valid URL, use as-is */ }
    }

    if (!targetUrl) {
      res.writeHead(400).end("Missing url parameter");
      return;
    }

    // Check cache
    const cached = cacheGet(targetUrl, time);
    if (cached) {
      console.log(`[CACHE HIT] ${targetUrl}`);
      sendCached(res, cached, targetUrl, time);
      return;
    }

    try {
      const archiveUrl = arcUrl(targetUrl, time);
      console.log(`${targetUrl} => ${archiveUrl}`);
      const fetchRes = await fetch(archiveUrl);

      if (fetchRes.headers.get("x-ts") === "404") {
        res.writeHead(404).end("Not found in archive");
        return;
      }

      const contentType = fetchRes.headers.get("content-type") || "";
      res.setHeader("Content-Type", contentType);
      res.setHeader("X-Archive-Url", fetchRes.url);
      res.setHeader("X-Original-Url", targetUrl);
      res.setHeader("X-Cache", "MISS");

      // Extract actual archive timestamp from the resolved URL
      const archiveTimeMatch = fetchRes.url.match(/\/web\/(\d{14})\//);
      const archiveTime = archiveTimeMatch ? archiveTimeMatch[1] : "";
      if (archiveTime) {
        res.setHeader("X-Archive-Time", archiveTime);
      }

      const isHtml = contentType.startsWith("text/html");

      if (isHtml) {
        const proxyBase = `http://${hostname}:${port}`;
        const html = await fetchRes.text();
        const filtered = stripWaybackToolbar(html, fetchRes.url);

        // Cache the filtered HTML (before link rewriting, since rewriting
        // depends on the current hostname/port which could change)
        cachePut(targetUrl, time, {
          contentType,
          archiveUrl: fetchRes.url,
          archiveTime,
          body: filtered,
          isHtml: true,
        });

        const rewritten = rewriteArchiveLinks(filtered, proxyBase, time);
        res.end(rewritten);
      } else {
        const buffer = Buffer.from(await fetchRes.arrayBuffer());

        cachePut(targetUrl, time, {
          contentType,
          archiveUrl: fetchRes.url,
          archiveTime,
          body: buffer.toString("base64"),
          isHtml: false,
        });

        res.end(buffer);
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      console.error(e);
      res.writeHead(500).end(`TimeMachine error: ${message}`);
    }
  },
);

const shutdown = () => {
  console.log("TimeMachine shutting down...");
  server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(port, () => {
  console.log(`TimeMachine server listening on http://${hostname}:${port}`);
});
