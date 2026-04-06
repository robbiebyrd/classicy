// This project is slightly adapted from the work of Rémi, an amazing
// developer who also loves retro computing.
// The source: https://github.com/remino/timeprox
// Rémi's website: https://remino.net

import { createHash } from "node:crypto";
import { existsSync, promises as fs, mkdirSync } from "node:fs";
import http, { type IncomingMessage, type ServerResponse } from "node:http";
import { join } from "node:path";

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

const arcUrl = (url: string, time: string): string =>
	`${prefix}/${time}/${url}`;

// All archive fetches must target the configured prefix — this is the authoritative
// check that prevents SSRF if the URL somehow bypasses upstream validation.
const ARCHIVE_URL_PREFIX = `${prefix}/`;

// --- Archive rate limiter ---

const RETRYABLE_ERROR_CODES = new Set([
	"ECONNREFUSED",
	"ECONNRESET",
	"ETIMEDOUT",
]);

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

const isRetryable = (err: unknown): boolean => {
	if (!(err instanceof Error)) return false;
	const cause = (err as Error & { cause?: unknown }).cause;
	const code = (cause as NodeJS.ErrnoException | undefined)?.code;
	return code !== undefined && RETRYABLE_ERROR_CODES.has(code);
};

let rateTokens = archiveBurst;
let rateLastRefill = Date.now();
let activeFetches = 0;

const fetchFromArchive = (
	url: string,
	retriesLeft = archiveMaxRetries,
	resourceType: ResourceType = "document",
): Promise<Response> =>
	new Promise((resolve, reject) => {
		if (!url.startsWith(ARCHIVE_URL_PREFIX)) {
			reject(new Error(`Refusing to fetch non-archive URL: ${url}`));
			return;
		}
		const attempt = () => {
			if (activeFetches >= archiveMaxConcurrent) {
				setTimeout(attempt, 50);
				return;
			}
			const now = Date.now();
			rateTokens = Math.min(
				archiveBurst,
				rateTokens + ((now - rateLastRefill) / 1000) * archiveRatePerSec,
			);
			rateLastRefill = now;
			if (rateTokens >= 1) {
				rateTokens -= 1;
				activeFetches++;
				fetch(url, { headers: BROWSER_HEADERS[resourceType] }).then(
					(res) => {
						activeFetches--;
						resolve(res);
					},
					(err) => {
						activeFetches--;
						if (isRetryable(err) && retriesLeft > 0) {
							const backoffMs =
								1000 * backOffIntervalSec ** (archiveMaxRetries - retriesLeft);
							console.warn(
								"[TimeMachine] Connection error, retrying after cooloff",
								{
									url,
									retriesLeft,
									backoffMs,
									error: err instanceof Error ? err.message : String(err),
								},
							);
							setTimeout(
								() =>
									fetchFromArchive(url, retriesLeft - 1).then(resolve, reject),
								backoffMs,
							);
						} else {
							reject(err);
						}
					},
				);
			} else {
				setTimeout(
					attempt,
					Math.ceil(((1 - rateTokens) / archiveRatePerSec) * 1000),
				);
			}
		};
		attempt();
	});

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

const shutdown = () => {
	console.log("TimeMachine shutting down...");
	server.close(() => process.exit(0));
};

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);

server.listen(port, () => {
	console.log(`TimeMachine server listening on http://${hostname}:${port}`);
});
