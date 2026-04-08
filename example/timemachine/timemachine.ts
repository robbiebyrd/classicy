// This project is slightly adapted from the work of Rémi, an amazing
// developer who also loves retro computing.
// The source: https://github.com/remino/timeprox
// Rémi's website: https://remino.net

import { createHash } from "node:crypto";
import { existsSync, promises as fs, mkdirSync } from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";
import { WebSocketServer, type WebSocket } from "ws";

const port: number = Number(process.env.TIMEMACHINE_PORT) || 8765;
const defaultTime: string = process.env.ARCHIVE_TIME || "19980101000000";
const prefix: string = process.env.URL_PREFIX || "https://web.archive.org/web";
const hostname = process.env.LISTENER || "0.0.0.0";
const cacheDir: string = process.env.CACHE_DIR ?? "/app/cache";
const cacheEnabled: boolean =
	process.env.CACHE_ENABLED?.toLowerCase() !== "false";
const allowedOrigin: string =
	process.env.CORS_ORIGIN || "http://localhost:5173";
const archiveRatePerSec: number = Number(process.env.ARCHIVE_RATE_PER_SEC) || 2;
const archiveBurst: number = Number(process.env.ARCHIVE_BURST) || 5;
const archiveMaxRetries: number = Number(process.env.ARCHIVE_MAX_RETRIES) || 3;
const backOffIntervalSec: number =
	Number(process.env.BACKOFF_INTERVAL_SEC) || 10;
const archiveMaxConcurrent: number =
	Number(process.env.ARCHIVE_MAX_CONCURRENT) || 10;
const whitelistHosts: string =
	process.env.WHITELIST_HOSTS || "*";
const proxyPrefix: string =
	process.env.PROXY_PREFIX || "";

if (!existsSync(cacheDir)) {
	mkdirSync(cacheDir, { recursive: true });
}

console.log({
	options: {
		port,
		defaultTime,
		prefix,
		hostname,
		cacheDir: cacheEnabled ? cacheDir : "disabled",
		cacheEnabled,
		allowedOrigin,
		archiveRatePerSec,
		archiveBurst,
		archiveMaxRetries,
		archiveMaxConcurrent,
		whitelistHosts,
		proxyPrefix,
	},
});

// --- Host whitelist ---

const parseWhitelist = (raw: string): string[] =>
	raw.split(",").map((h) => h.trim()).filter(Boolean);

const isHostWhitelisted = (targetUrl: string): boolean => {
	if (whitelistHosts === "*") return true;
	const allowed = parseWhitelist(whitelistHosts);
	if (allowed.length === 0) return true;
	try {
		const { hostname: targetHost } = new URL(targetUrl);
		return allowed.some((pattern) => {
			if (pattern.startsWith("*.")) {
				const suffix = pattern.slice(1);
				return targetHost.endsWith(suffix) || targetHost === pattern.slice(2);
			}
			return targetHost === pattern;
		});
	} catch {
		return false;
	}
};

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
	isCss: boolean;
}

const cacheKey = (url: string, time: string): string =>
	createHash("sha256").update(`${time}:${url}`).digest("hex");

const cacheGet = async (
	url: string,
	time: string,
): Promise<CacheEntry | null> => {
	if (!cacheEnabled) return null;
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
	if (!cacheEnabled) return;
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
const RE_IMG_SRC_ABSOLUTE =
	/(<img\b[^>]*?\bsrc\s*=\s*["'])https?:\/\/web\.archive\.org\/web\/\d{1,14}[^/]*\/(https?:\/\/[^"']*)(["'])/gi;
const RE_IMG_SRC_RELATIVE =
	/(<img\b[^>]*?\bsrc\s*=\s*["'])\/web\/\d{1,14}[^/]*\/(https?:\/\/[^"']*)(["'])/gi;
const RE_CSS_URL_ABSOLUTE =
	/(url\s*\(\s*['"]?)https?:\/\/web\.archive\.org\/web\/\d{1,14}[^/]*\/(https?:\/\/[^"')]*?)(['"]?\s*\))/gi;
const RE_CSS_URL_RELATIVE =
	/(url\s*\(\s*['"]?)\/web\/\d{1,14}[^/]*\/(https?:\/\/[^"')]*?)(['"]?\s*\))/gi;
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

const arcUrl = (url: string, time: string): string => {
	const base = `${prefix}/${time}`;
	return proxyPrefix ? `${base}/${proxyPrefix}/${url}` : `${base}/${url}`;
};

// All archive fetches must target the configured prefix — this is the authoritative
// check that prevents SSRF if the URL somehow bypasses upstream validation.
const ARCHIVE_URL_PREFIX = `${prefix}/`;

// --- Request queue with concurrency limiting and rate control ---

type ResourceType = "document" | "image" | "style";

const BROWSER_UA =
	"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const BROWSER_HEADERS: Record<ResourceType, Record<string, string>> = {
	document: {
		"User-Agent": BROWSER_UA,
		Accept:
			"text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
		"Accept-Language": "en-US,en;q=0.9",
		"Accept-Encoding": "gzip, deflate, br",
		"Upgrade-Insecure-Requests": "1",
		"Sec-Fetch-Dest": "document",
		"Sec-Fetch-Mode": "navigate",
		"Sec-Fetch-Site": "none",
		"Sec-Fetch-User": "?1",
	},
	image: {
		"User-Agent": BROWSER_UA,
		Accept: "image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
		"Accept-Language": "en-US,en;q=0.9",
		"Accept-Encoding": "gzip, deflate, br",
		"Sec-Fetch-Dest": "image",
		"Sec-Fetch-Mode": "no-cors",
		"Sec-Fetch-Site": "cross-site",
	},
	style: {
		"User-Agent": BROWSER_UA,
		Accept: "text/css,*/*;q=0.1",
		"Accept-Language": "en-US,en;q=0.9",
		"Accept-Encoding": "gzip, deflate, br",
		"Sec-Fetch-Dest": "style",
		"Sec-Fetch-Mode": "no-cors",
		"Sec-Fetch-Site": "cross-site",
	},
};

const RETRYABLE_ERROR_CODES = new Set([
	"ECONNREFUSED",
	"ECONNRESET",
	"ETIMEDOUT",
]);

const isRetryable = (err: unknown): boolean => {
	if (!(err instanceof Error)) return false;
	const cause = (err as Error & { cause?: unknown }).cause;
	const code = (cause as NodeJS.ErrnoException | undefined)?.code;
	return code !== undefined && RETRYABLE_ERROR_CODES.has(code);
};

interface QueueEntry {
	execute: () => Promise<Response>;
	resolve: (value: Response) => void;
	reject: (reason: unknown) => void;
}

class ArchiveRequestQueue {
	private queue: QueueEntry[] = [];
	private active = 0;
	private rateTokens: number;
	private rateLastRefill = Date.now();
	private drainScheduled = false;

	constructor(
		private readonly maxConcurrent: number,
		private readonly ratePerSec: number,
		private readonly burst: number,
	) {
		this.rateTokens = burst;
	}

	enqueue(execute: () => Promise<Response>): Promise<Response> {
		return new Promise<Response>((resolve, reject) => {
			this.queue.push({ execute, resolve, reject });
			this.scheduleDrain();
		});
	}

	get pending(): number {
		return this.queue.length;
	}

	get running(): number {
		return this.active;
	}

	private scheduleDrain(): void {
		if (this.drainScheduled) return;
		this.drainScheduled = true;
		queueMicrotask(() => {
			this.drainScheduled = false;
			this.drain();
		});
	}

	private drain(): void {
		while (this.queue.length > 0 && this.active < this.maxConcurrent) {
			this.refillTokens();
			if (this.rateTokens < 1) {
				const waitMs = Math.ceil(
					((1 - this.rateTokens) / this.ratePerSec) * 1000,
				);
				setTimeout(() => this.drain(), waitMs);
				return;
			}

			this.rateTokens -= 1;
			const entry = this.queue.shift()!;
			this.active++;

			entry
				.execute()
				.then(
					(res) => entry.resolve(res),
					(err) => entry.reject(err),
				)
				.finally(() => {
					this.active--;
					this.scheduleDrain();
				});
		}
	}

	private refillTokens(): void {
		const now = Date.now();
		this.rateTokens = Math.min(
			this.burst,
			this.rateTokens +
				((now - this.rateLastRefill) / 1000) * this.ratePerSec,
		);
		this.rateLastRefill = now;
	}
}

const archiveQueue = new ArchiveRequestQueue(
	archiveMaxConcurrent,
	archiveRatePerSec,
	archiveBurst,
);

const fetchFromArchive = async (
	url: string,
	retriesLeft = archiveMaxRetries,
	resourceType: ResourceType = "document",
): Promise<Response> => {
	if (!url.startsWith(ARCHIVE_URL_PREFIX)) {
		throw new Error(`Refusing to fetch non-archive URL: ${url}`);
	}

	try {
		return await archiveQueue.enqueue(() =>
			fetch(url, { headers: BROWSER_HEADERS[resourceType] }),
		);
	} catch (err) {
		if (isRetryable(err) && retriesLeft > 0) {
			const backoffMs =
				1000 * backOffIntervalSec ** (archiveMaxRetries - retriesLeft);
			console.warn("[TimeMachine] Connection error, retrying after cooloff", {
				url,
				retriesLeft,
				backoffMs,
				error: err instanceof Error ? err.message : String(err),
			});
			await new Promise((r) => setTimeout(r, backoffMs));
			return fetchFromArchive(url, retriesLeft - 1, resourceType);
		}
		throw err;
	}
};

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

const _rewriteImageUrls = (
	html: string,
	proxyBase: string,
	time: string,
): string =>
	html
		.replace(
			RE_IMG_SRC_ABSOLUTE,
			(_, before, originalUrl, after) =>
				`${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`,
		)
		.replace(
			RE_IMG_SRC_RELATIVE,
			(_, before, originalUrl, after) =>
				`${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`,
		);

const rewriteCssUrls = (css: string, proxyBase: string, time: string): string =>
	css
		.replace(
			RE_CSS_URL_ABSOLUTE,
			(_, before, originalUrl, after) =>
				`${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`,
		)
		.replace(
			RE_CSS_URL_RELATIVE,
			(_, before, originalUrl, after) =>
				`${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`,
		);

const collectWaybackResourceUrls = (html: string): string[] => {
	const urls = new Set<string>();
	for (const re of [
		RE_IMG_SRC_ABSOLUTE,
		RE_IMG_SRC_RELATIVE,
		RE_CSS_URL_ABSOLUTE,
		RE_CSS_URL_RELATIVE,
	]) {
		for (const match of html.matchAll(re)) urls.add(match[2]);
	}
	return [...urls];
};

const rewriteImageUrlsFiltered = (
	html: string,
	proxyBase: string,
	time: string,
	cachedUrls: Set<string>,
): string =>
	html
		.replace(RE_IMG_SRC_ABSOLUTE, (full, before, originalUrl, after) =>
			cachedUrls.has(originalUrl)
				? `${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`
				: full,
		)
		.replace(RE_IMG_SRC_RELATIVE, (full, before, originalUrl, after) =>
			cachedUrls.has(originalUrl)
				? `${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`
				: full,
		);

const rewriteCssUrlsFiltered = (
	css: string,
	proxyBase: string,
	time: string,
	cachedUrls: Set<string>,
): string =>
	css
		.replace(RE_CSS_URL_ABSOLUTE, (full, before, originalUrl, after) =>
			cachedUrls.has(originalUrl)
				? `${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`
				: full,
		)
		.replace(RE_CSS_URL_RELATIVE, (full, before, originalUrl, after) =>
			cachedUrls.has(originalUrl)
				? `${before}${proxyBase}/?url=${encodeURIComponent(originalUrl)}&time=${time}${after}`
				: full,
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

// --- Image prefetch ---

const fetchAndCacheImage = async (
	url: string,
	time: string,
): Promise<boolean> => {
	if (await cacheGet(url, time)) return true;
	try {
		const archiveUrl = arcUrl(url, time);
		console.log(`${url} => ${archiveUrl}`);
		const fetchRes = await fetchFromArchive(
			archiveUrl,
			archiveMaxRetries,
			"image",
		);
		if (!fetchRes.ok) return false;
		const contentType = fetchRes.headers.get("content-type") || "";
		const archiveTimeMatch = fetchRes.url.match(RE_ARCHIVE_TIME);
		const archiveTime = archiveTimeMatch ? archiveTimeMatch[1] : "";
		await cachePut(url, time, {
			contentType,
			archiveUrl: fetchRes.url,
			archiveTime,
			body: Buffer.from(await fetchRes.arrayBuffer()).toString("base64"),
			isHtml: false,
			isCss: false,
		});
		return true;
	} catch {
		return false;
	}
};

const getCachedResourceUrls = async (
	html: string,
	time: string,
): Promise<Set<string>> => {
	const urls = collectWaybackResourceUrls(html);
	const results = await Promise.all(
		urls.map(async (url) => ({ url, cached: !!(await cacheGet(url, time)) })),
	);
	return new Set(results.filter((r) => r.cached).map((r) => r.url));
};

const prefetchResources = (html: string, time: string): void => {
	for (const url of collectWaybackResourceUrls(html)) {
		fetchAndCacheImage(url, time).catch(() => {
			// errors already logged inside fetchAndCacheImage
		});
	}
};

// --- Cache management ---

const RE_WAYBACK_EXTRACT_URL = /\/web\/\d{1,14}[^/]*\/(https?:\/\/.+)/;

const domainMatcher = (
	pattern: string | null,
): ((hostname: string) => boolean) => {
	if (!pattern) return () => true;
	const rePattern = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*");
	const re = new RegExp(`^${rePattern}$`, "i");
	return (h) => re.test(h);
};

const matchesTypeFilter = (entry: CacheEntry, type: string | null): boolean => {
	if (!type) return true;
	if (type === "html") return entry.isHtml;
	if (type === "css") return entry.isCss;
	if (type === "image") return entry.contentType.startsWith("image/");
	return false;
};

const handleCacheClear = async (
	req: IncomingMessage,
	res: ServerResponse,
): Promise<void> => {
	const reqUrl = new URL(req.url ?? "/", `http://localhost:${port}`);
	const typeParam = reqUrl.searchParams.get("type");
	const domainParam = reqUrl.searchParams.get("domain");
	const matchDomain = domainMatcher(domainParam);

	let files: string[];
	try {
		files = await fs.readdir(cacheDir);
	} catch {
		res.setHeader("Content-Type", "application/json");
		res
			.writeHead(500)
			.end(JSON.stringify({ error: "Failed to read cache directory" }));
		return;
	}

	let deleted = 0;
	let errors = 0;

	await Promise.all(
		files
			.filter((f) => f.endsWith(".json"))
			.map(async (file) => {
				const filePath = join(cacheDir, file);
				try {
					const data = await fs.readFile(filePath, "utf-8");
					const entry = JSON.parse(data) as CacheEntry;

					if (!matchesTypeFilter(entry, typeParam)) return;

					if (domainParam) {
						const urlMatch = entry.archiveUrl.match(RE_WAYBACK_EXTRACT_URL);
						if (!urlMatch) return;
						try {
							const { hostname } = new URL(urlMatch[1]);
							if (!matchDomain(hostname)) return;
						} catch {
							return;
						}
					}

					await fs.unlink(filePath);
					deleted++;
				} catch (e) {
					errors++;
					console.warn("[TimeMachine] Cache clear error", {
						file,
						error: e instanceof Error ? e.message : String(e),
					});
				}
			}),
	);

	res.setHeader("Content-Type", "application/json");
	res.writeHead(200).end(JSON.stringify({ deleted, errors }));
};

// --- Shared proxy fetch logic ---

interface ProxyResult {
	contentType: string;
	archiveUrl: string;
	originalUrl: string;
	archiveTime: string;
	body: string | Buffer;
	cache: "HIT" | "MISS";
}

const proxyFetch = async (
	targetUrl: string,
	time: string,
): Promise<ProxyResult> => {
	const proxyBase = `http://${hostname}:${port}`;

	// Check cache
	const cached = await cacheGet(targetUrl, time);
	if (cached) {
		console.log(`[CACHE HIT] ${targetUrl}`);
		let body: string | Buffer;
		if (cached.isHtml) {
			const cachedUrls = await getCachedResourceUrls(cached.body, time);
			prefetchResources(cached.body, time);
			body = rewriteArchiveLinks(
				rewriteImageUrlsFiltered(
					rewriteCssUrlsFiltered(cached.body, proxyBase, time, cachedUrls),
					proxyBase,
					time,
					cachedUrls,
				),
				proxyBase,
				time,
			);
		} else if (cached.isCss) {
			body = rewriteCssUrls(cached.body, proxyBase, time);
		} else {
			body = Buffer.from(cached.body, "base64");
		}
		return {
			contentType: cached.contentType,
			archiveUrl: cached.archiveUrl,
			originalUrl: targetUrl,
			archiveTime: cached.archiveTime,
			body,
			cache: "HIT",
		};
	}

	// Fetch from archive
	const archiveUrl = arcUrl(targetUrl, time);
	console.log(`${targetUrl} => ${archiveUrl}`);
	const fetchRes = await fetchFromArchive(archiveUrl);

	if (fetchRes.headers.get("x-ts") === "404") {
		throw Object.assign(new Error("Not found in archive"), { status: 404 });
	}

	if (!fetchRes.ok) {
		throw Object.assign(
			new Error(`Archive returned ${fetchRes.status}`),
			{ status: fetchRes.status },
		);
	}

	const contentType = fetchRes.headers.get("content-type") || "";
	const archiveTimeMatch = fetchRes.url.match(RE_ARCHIVE_TIME);
	const archiveTime = archiveTimeMatch ? archiveTimeMatch[1] : "";

	const isHtml = contentType.startsWith("text/html");
	const isCss = contentType.startsWith("text/css");

	let body: string | Buffer;
	if (isHtml) {
		const html = await fetchRes.text();
		const filtered = stripWaybackToolbar(html, fetchRes.url);
		await cachePut(targetUrl, time, {
			contentType,
			archiveUrl: fetchRes.url,
			archiveTime,
			body: filtered,
			isHtml: true,
			isCss: false,
		});
		prefetchResources(filtered, time);
		const empty = new Set<string>();
		body = rewriteArchiveLinks(
			rewriteImageUrlsFiltered(
				rewriteCssUrlsFiltered(filtered, proxyBase, time, empty),
				proxyBase,
				time,
				empty,
			),
			proxyBase,
			time,
		);
	} else if (isCss) {
		const css = await fetchRes.text();
		await cachePut(targetUrl, time, {
			contentType,
			archiveUrl: fetchRes.url,
			archiveTime,
			body: css,
			isHtml: false,
			isCss: true,
		});
		body = rewriteCssUrls(css, proxyBase, time);
	} else {
		const buffer = Buffer.from(await fetchRes.arrayBuffer());
		await cachePut(targetUrl, time, {
			contentType,
			archiveUrl: fetchRes.url,
			archiveTime,
			body: buffer.toString("base64"),
			isHtml: false,
			isCss: false,
		});
		body = buffer;
	}

	return {
		contentType,
		archiveUrl: fetchRes.url,
		originalUrl: targetUrl,
		archiveTime,
		body,
		cache: "MISS",
	};
};

// --- Server ---

const sendCached = async (
	res: ServerResponse,
	entry: CacheEntry,
	targetUrl: string,
	time: string,
): Promise<void> => {
	res.setHeader("Content-Type", entry.contentType);
	res.setHeader("X-Archive-Url", entry.archiveUrl);
	res.setHeader("X-Original-Url", targetUrl);
	res.setHeader("X-Cache", "HIT");
	if (entry.archiveTime) {
		res.setHeader("X-Archive-Time", entry.archiveTime);
	}

	if (entry.isHtml) {
		const proxyBase = `http://${hostname}:${port}`;
		// Check what's already cached, then kick off background fetches for the rest
		const cachedUrls = await getCachedResourceUrls(entry.body, time);
		prefetchResources(entry.body, time);
		const rewritten = rewriteArchiveLinks(
			rewriteImageUrlsFiltered(
				rewriteCssUrlsFiltered(entry.body, proxyBase, time, cachedUrls),
				proxyBase,
				time,
				cachedUrls,
			),
			proxyBase,
			time,
		);
		res.end(rewritten);
	} else if (entry.isCss) {
		const proxyBase = `http://${hostname}:${port}`;
		res.end(rewriteCssUrls(entry.body, proxyBase, time));
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
		res.setHeader("Access-Control-Allow-Methods", "GET, DELETE, OPTIONS");
		res.setHeader("Access-Control-Allow-Headers", "Content-Type");
		res.setHeader(
			"Access-Control-Expose-Headers",
			"X-Archive-Url, X-Original-Url, X-Archive-Time, X-Cache",
		);

		if (req.method === "OPTIONS") {
			res.writeHead(204).end();
			return;
		}

		if (req.method === "DELETE") {
			const { pathname } = new URL(req.url ?? "/", `http://localhost:${port}`);
			if (pathname === "/cache") {
				await handleCacheClear(req, res);
				return;
			}
			res.writeHead(404).end("Not found");
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

		// Check host whitelist
		if (!isHostWhitelisted(targetUrl)) {
			res.writeHead(403).end("Host not whitelisted");
			return;
		}

		// Check cache
		const cached = await cacheGet(targetUrl, time);
		if (cached) {
			console.log(`[CACHE HIT] ${targetUrl}`);
			await sendCached(res, cached, targetUrl, time);
			return;
		}

		try {
			const archiveUrl = arcUrl(targetUrl, time);
			console.log(`${targetUrl} => ${archiveUrl}`);
			const fetchRes = await fetchFromArchive(archiveUrl);

			if (fetchRes.headers.get("x-ts") === "404") {
				res.writeHead(404).end("Not found in archive");
				return;
			}

			if (!fetchRes.ok) {
				res
					.writeHead(fetchRes.status)
					.end(`Archive returned ${fetchRes.status}`);
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
			const isCss = contentType.startsWith("text/css");

			if (isHtml) {
				const proxyBase = `http://${hostname}:${port}`;
				const html = await fetchRes.text();
				const filtered = stripWaybackToolbar(html, fetchRes.url);

				// Cache stripped HTML before attempting image prefetch — if prefetch is
				// partial the retry path in sendCached will fill in the gaps on next request
				await cachePut(targetUrl, time, {
					contentType,
					archiveUrl: fetchRes.url,
					archiveTime,
					body: filtered,
					isHtml: true,
					isCss: false,
				});

				// Serve immediately; images warm up in the background
				prefetchResources(filtered, time);
				const empty = new Set<string>();
				const rewritten = rewriteArchiveLinks(
					rewriteImageUrlsFiltered(
						rewriteCssUrlsFiltered(filtered, proxyBase, time, empty),
						proxyBase,
						time,
						empty,
					),
					proxyBase,
					time,
				);
				res.end(rewritten);
			} else if (isCss) {
				const proxyBase = `http://${hostname}:${port}`;
				const css = await fetchRes.text();

				await cachePut(targetUrl, time, {
					contentType,
					archiveUrl: fetchRes.url,
					archiveTime,
					body: css,
					isHtml: false,
					isCss: true,
				});

				res.end(rewriteCssUrls(css, proxyBase, time));
			} else {
				const buffer = Buffer.from(await fetchRes.arrayBuffer());

				await cachePut(targetUrl, time, {
					contentType,
					archiveUrl: fetchRes.url,
					archiveTime,
					body: buffer.toString("base64"),
					isHtml: false,
					isCss: false,
				});

				res.end(buffer);
			}
		} catch (e) {
			console.error("[TimeMachine] Upstream request failed:", e);
			res.writeHead(500).end("TimeMachine error: upstream request failed");
		}
	},
);

// --- WebSocket server ---

interface WsRequest {
	type: "fetch";
	id?: string;
	url: string;
	time?: string;
}

interface WsResponse {
	type: "result" | "error";
	id?: string;
	html?: string;
	contentType?: string;
	archiveUrl?: string;
	originalUrl?: string;
	archiveTime?: string;
	cache?: "HIT" | "MISS";
	status?: number;
	message?: string;
}

const wss = new WebSocketServer({ server, path: "/ws" });

wss.on("connection", (ws: WebSocket) => {
	console.log("[TimeMachine WS] Client connected");

	ws.on("message", (raw: Buffer | string) => {
		const data = typeof raw === "string" ? raw : raw.toString("utf-8");

		let msg: WsRequest;
		try {
			msg = JSON.parse(data) as WsRequest;
		} catch {
			const err: WsResponse = {
				type: "error",
				status: 400,
				message: "Invalid JSON",
			};
			ws.send(JSON.stringify(err));
			return;
		}

		if (msg.type !== "fetch" || !msg.url) {
			const err: WsResponse = {
				type: "error",
				id: msg.id,
				status: 400,
				message: "Expected { type: \"fetch\", url: \"...\" }",
			};
			ws.send(JSON.stringify(err));
			return;
		}

		// Validate time parameter
		let time: string;
		try {
			time = sanitizeTimeParam(msg.time ?? null);
		} catch {
			const err: WsResponse = {
				type: "error",
				id: msg.id,
				status: 400,
				message: "Invalid time parameter",
			};
			ws.send(JSON.stringify(err));
			return;
		}

		// Validate and process the URL
		let targetUrl: string;
		try {
			targetUrl = validateTargetUrl(msg.url);
		} catch (e) {
			const err: WsResponse = {
				type: "error",
				id: msg.id,
				status: 403,
				message: e instanceof Error ? e.message : "Invalid URL",
			};
			ws.send(JSON.stringify(err));
			return;
		}

		if (!isHostWhitelisted(targetUrl)) {
			const err: WsResponse = {
				type: "error",
				id: msg.id,
				status: 403,
				message: "Host not whitelisted",
			};
			ws.send(JSON.stringify(err));
			return;
		}

		// Fetch and respond asynchronously
		proxyFetch(targetUrl, time)
			.then((result) => {
				if (ws.readyState !== ws.OPEN) return;
				const bodyStr =
					typeof result.body === "string"
						? result.body
						: result.body.toString("base64");
				const resp: WsResponse = {
					type: "result",
					id: msg.id,
					html: bodyStr,
					contentType: result.contentType,
					archiveUrl: result.archiveUrl,
					originalUrl: result.originalUrl,
					archiveTime: result.archiveTime,
					cache: result.cache,
				};
				ws.send(JSON.stringify(resp));
			})
			.catch((e: unknown) => {
				if (ws.readyState !== ws.OPEN) return;
				const status =
					(e as { status?: number }).status ?? 500;
				const err: WsResponse = {
					type: "error",
					id: msg.id,
					status,
					message:
						e instanceof Error
							? e.message
							: "Upstream request failed",
				};
				ws.send(JSON.stringify(err));
			});
	});

	ws.on("close", () => {
		console.log("[TimeMachine WS] Client disconnected");
	});
});

const shutdown = () => {
	console.log("TimeMachine shutting down...");
	wss.close();
	server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(port, () => {
	console.log(`TimeMachine server listening on http://${hostname}:${port}`);
	console.log(`TimeMachine WebSocket listening on ws://${hostname}:${port}/ws`);
});
