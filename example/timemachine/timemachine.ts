// This project is slightly adapted from the work of Rémi, an amazing
// developer who also loves retro computing.
// The source: https://github.com/remino/timeprox
// Rémi's website: https://remino.net

import http, { IncomingMessage, ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";

const port: number = Number(process.env.TIMEMACHINE_PORT) || 8765;
const defaultTime: string = process.env.ARCHIVE_TIME || "19980101000000";
const prefix: string = process.env.URL_PREFIX || "https://web.archive.org/web";
const hostname = process.env.LISTENER || "0.0.0.0";
const cacheDir: string = process.env.CACHE_DIR ?? "/app/cache";
const allowedOrigin: string =
  process.env.CORS_ORIGIN || "http://localhost:5173";

if (!existsSync(cacheDir)) {
  mkdirSync(cacheDir, { recursive: true });
}

console.log({
  options: {
    port,
    defaultTime,
    prefix,
    hostname,
    cacheDir: cacheDir || "disabled",
    allowedOrigin,
  },
});

// --- URL validation ---

const ALLOWED_PROTOCOLS = new Set(["http:", "https:"]);
const PRIVATE_HOST_RE =
  /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|169\.254\.|0\.0\.0\.0|\[?::1\]?)/;

const validateTargetUrl = (raw: string): string => {
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error("Invalid URL");
  }
  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new Error("Disallowed protocol");
  }
  if (PRIVATE_HOST_RE.test(parsed.hostname)) {
    throw new Error("Private/internal hosts disallowed");
  }
  return raw;
};

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

const cacheGet = async (
  url: string,
  time: string,
): Promise<CacheEntry | null> => {
  const file = join(cacheDir, `${cacheKey(url, time)}.json`);
  try {
    const data = await fs.readFile(file, "utf-8");
    return JSON.parse(data) as CacheEntry;
  } catch (e) {
    const code = (e as NodeJS.ErrnoException).code;
    if (code !== "ENOENT") {
      console.warn("[TimeMachine] Failed to read cache entry", {
        file,
        url,
        error: e instanceof Error ? e.message : String(e),
      });
    }
    return null;
  }
};

const cachePut = async (
  url: string,
  time: string,
  entry: CacheEntry,
): Promise<void> => {
  const file = join(cacheDir, `${cacheKey(url, time)}.json`);
  try {
    await fs.writeFile(file, JSON.stringify(entry));
  } catch (e) {
    console.error("[TimeMachine] Failed to write cache entry", {
      file,
      url,
      error: e instanceof Error ? e.message : String(e),
    });
  }
};

// --- URL rewriting (regexes hoisted to module scope) ---

const RE_ARCHIVE_ABSOLUTE =
  /(<a\b[^>]*\bhref\s*=\s*["'])https?:\/\/web\.archive\.org\/web\/\d{1,14}\/(https?:\/\/[^"']*)(["'])/gi;
const RE_ARCHIVE_RELATIVE =
  /(<a\b[^>]*\bhref\s*=\s*["'])\/web\/\d{1,14}\/(https?:\/\/[^"']*)(["'])/gi;
const RE_LEADING_WHITESPACE = /^[\s\t\r\n]+</i;
const RE_WAYBACK_JS_HEAD =
  /((?:<head[^>]*>))[\s\S]*?<!-- End Wayback Rewrite JS Include -->/i;
const RE_WAYBACK_JS_HTML =
  /((?:<html[^>]*>))[\s\S]*?<!-- End Wayback Rewrite JS Include -->/i;
const RE_WAYBACK_TOOLBAR =
  /<!-- BEGIN WAYBACK TOOLBAR INSERT -->[\s\S]*?<!-- END WAYBACK TOOLBAR INSERT -->/gi;
const RE_HEAD_TAG = /(<head[^>]*>)/i;
const RE_ARCHIVE_TIME = /\/web\/(\d{14})\//;

const sanitizeTimeParam = (rawTime: string | null): string => {
  if (!rawTime) {
    return defaultTime;
  }
  if (/^\d{14}$/.test(rawTime)) {
    return rawTime;
  }
  throw new Error("Invalid time parameter");
};

const arcUrl = (url: string, time: string): string =>
  `${prefix}/${time}/${url}`;

const rewriteArchiveLinks = (
  html: string,
  proxyBase: string,
  time: string,
): string =>
  html
    .replace(
      RE_ARCHIVE_ABSOLUTE,
      (_, before, originalUrl, after) =>
        `${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`,
    )
    .replace(
      RE_ARCHIVE_RELATIVE,
      (_, before, originalUrl, after) =>
        `${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`,
    );

const stripWaybackToolbar = (html: string, baseUrl: string): string => {
  const safeBase = baseUrl.replace(/"/g, "%22");
  return html
    .replace(RE_LEADING_WHITESPACE, "<")
    .replace(RE_WAYBACK_JS_HEAD, "$1")
    .replace(RE_WAYBACK_JS_HTML, "$1")
    .replace(RE_WAYBACK_TOOLBAR, "")
    .replace(RE_HEAD_TAG, `$1<base href="${safeBase}">`);
};

// --- Server ---

const sendCached = (
  res: ServerResponse,
  entry: CacheEntry,
  targetUrl: string,
  time: string,
): void => {
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
    const origin = req.headers.origin;
    if (origin === allowedOrigin) {
      res.setHeader("Access-Control-Allow-Origin", origin);
    }
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
    let time: string;
    try {
      time = sanitizeTimeParam(reqUrl.searchParams.get("time"));
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid time parameter";
      res.writeHead(400).end(msg);
      return;
    }

    // Unwrap nested proxy URLs — if the target is itself a TimeMachine URL,
    // extract the real url param from it
    if (targetUrl) {
      try {
        const nested = new URL(targetUrl);
        if (nested.port === String(port) && nested.searchParams.has("url")) {
          targetUrl = nested.searchParams.get("url");
        }
      } catch {
        /* not a valid URL, use as-is */
      }
    }

    if (!targetUrl) {
      res.writeHead(400).end("Missing url parameter");
      return;
    }

    // Validate URL — block private/internal targets and non-http protocols
    try {
      targetUrl = validateTargetUrl(targetUrl);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Invalid URL";
      res.writeHead(403).end(msg);
      return;
    }

    // Check cache
    const cached = await cacheGet(targetUrl, time);
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

      const archiveTimeMatch = fetchRes.url.match(RE_ARCHIVE_TIME);
      const archiveTime = archiveTimeMatch ? archiveTimeMatch[1] : "";
      if (archiveTime) {
        res.setHeader("X-Archive-Time", archiveTime);
      }

      const isHtml = contentType.startsWith("text/html");

      if (isHtml) {
        const proxyBase = `http://${hostname}:${port}`;
        const html = await fetchRes.text();
        const filtered = stripWaybackToolbar(html, fetchRes.url);

        // Cache after toolbar stripping but before link rewriting
        await cachePut(targetUrl, time, {
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

        await cachePut(targetUrl, time, {
          contentType,
          archiveUrl: fetchRes.url,
          archiveTime,
          body: buffer.toString("base64"),
          isHtml: false,
        });

        res.end(buffer);
      }
    } catch (e) {
      console.error("[TimeMachine] Upstream request failed:", e);
      res.writeHead(500).end("TimeMachine error: upstream request failed");
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
