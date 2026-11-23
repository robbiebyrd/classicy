// Browser check for the WebP conversion (plan 0019-fb7 Part 5, §6.2): each
// converted image, drawn by a browser from its WebP, against the same image
// drawn by that browser from its original PNG or JPG. Each browser is its own
// reference, so color management counts: a PNG carrying gAMA and cHRM (and
// no sRGB chunk) may be color-managed where a WebP with no ICC profile draws
// as plain sRGB.
//
//   node bin/check-webp-in-browsers.ts --browser chromium|firefox [--out-dir DIR] [path-prefix ...]
//
// - The sources are bin/convert-images-to-webp.ts's: its scope, under the
//   prefixes if any, less CLASSICY_WEBP_KEEP_ORIGINAL. The original is read
//   from the repository, the WebP from classicyWebpTarget's path beside it,
//   or under DIR with --out-dir (the directory the converter wrote to).
// - A local HTTP server in this process serves both to one page, which loads
//   each pair as <img>, draws each at its natural size into a canvas of that
//   size (imageSmoothingEnabled off) and reads getImageData back.
// - A non-photo passes with 0 differing pixels (all four channels); a photo
//   (CLASSICY_WEBP_PHOTOS) with at least CLASSICY_WEBP_PHOTO_FLOOR_DB of PSNR
//   composited over white and over black (classicyPsnr, in Node).
// - $PLAYWRIGHT_MODULE overrides the Playwright module (a name, or the path
//   to a Playwright package directory): a browser build installed by another
//   Playwright version (a Firefox the workspace's 1.57.0 lacks, say) needs
//   that version's package.
//
// Exit codes: 0 when every image matches, 1 when one does not (or is missing
// or fails to load), 2 on a usage or environment error. Build script, not
// library code: it reports through stdout/stderr. Erasable TypeScript only.
import { existsSync, readFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import type { AddressInfo } from "node:net";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import type { Browser } from "playwright";
import { classicyPsnr } from "./classicyWebp.ts";
import {
	CLASSICY_WEBP_KEEP_ORIGINAL,
	CLASSICY_WEBP_PHOTO_FLOOR_DB,
	CLASSICY_WEBP_PHOTOS,
	CLASSICY_WEBP_REPO_ROOT,
	classicyWebpRepoPath,
	classicyWebpTarget,
	formatClassicyPsnr,
	readClassicyWebpScope,
} from "./convert-images-to-webp.ts";
import { PARITY_CHROMIUM_ARGS } from "./parity/parityBrowser.ts";

type Playwright = typeof import("playwright");
type BrowserName = "chromium" | "firefox";

/** Pairs drawn per round trip to the page. */
const BATCH = 24;

const CONTENT_TYPES: Record<string, string> = {
	".png": "image/png",
	".jpg": "image/jpeg",
	".webp": "image/webp",
};

type Pair = {
	source: string;
	original: string;
	webp: string;
	photo: boolean;
};

/** What the page reports for a pair. */
type Drawn =
	| { error: string }
	| {
			width: number;
			height: number;
			webpWidth: number;
			webpHeight: number;
			differing: number;
			maxDelta: number;
			/** For a photo: both drawings' RGBA, base64. */
			original?: string;
			webp?: string;
	  };

type Verdict = {
	source: string;
	ok: boolean;
	detail: string;
	psnr?: { white: number; black: number };
};

const requireFromHere = createRequire(import.meta.url);

function loadPlaywright(): Playwright {
	const specifier = process.env.PLAYWRIGHT_MODULE || "playwright";
	try {
		return requireFromHere(specifier) as Playwright;
	} catch (e) {
		throw new Error(
			`cannot load Playwright from "${specifier}" (${String(e).split("\n")[0]}). ` +
				"It is a devDependency of the workspace root: run `pnpm install`, " +
				"or point $PLAYWRIGHT_MODULE at a Playwright package directory.",
		);
	}
}

const urlPath = (prefix: string, path: string) =>
	`/${prefix}/${path.split("/").map(encodeURIComponent).join("/")}`;

/** In the page: load each pair, draw both and compare their pixels. */
async function drawPairs(
	pairs: readonly { original: string; webp: string; photo: boolean }[],
): Promise<Drawn[]> {
	const load = async (url: string) => {
		const image = new Image();
		image.src = url;
		await image.decode();
		return image;
	};
	const pixels = (image: HTMLImageElement) => {
		const canvas = document.createElement("canvas");
		canvas.width = image.naturalWidth;
		canvas.height = image.naturalHeight;
		const context = canvas.getContext("2d", { willReadFrequently: true });
		if (!context) throw new Error("no 2D canvas context");
		context.imageSmoothingEnabled = false;
		context.drawImage(image, 0, 0);
		return context.getImageData(0, 0, canvas.width, canvas.height).data;
	};
	const base64 = (data: Uint8ClampedArray) => {
		let text = "";
		for (let i = 0; i < data.length; i += 0x8000)
			text += String.fromCharCode(...data.subarray(i, i + 0x8000));
		return btoa(text);
	};
	const loaded = await Promise.all(
		pairs.map((pair) =>
			Promise.all([load(pair.original), load(pair.webp)]).then(
				(images) => ({ images }),
				(error: unknown) => ({ error: `${pair.original}: ${String(error)}` }),
			),
		),
	);
	return loaded.map((result, index): Drawn => {
		if ("error" in result) return { error: result.error };
		const [original, webp] = result.images;
		const sizes = {
			width: original.naturalWidth,
			height: original.naturalHeight,
			webpWidth: webp.naturalWidth,
			webpHeight: webp.naturalHeight,
		};
		if (sizes.width !== sizes.webpWidth || sizes.height !== sizes.webpHeight)
			return { ...sizes, differing: -1, maxDelta: -1 };
		try {
			const a = pixels(original);
			const b = pixels(webp);
			let differing = 0;
			let maxDelta = 0;
			for (let p = 0; p < a.length; p += 4) {
				let differs = false;
				for (let c = p; c < p + 4; c++) {
					const delta = Math.abs(a[c] - b[c]);
					if (delta > 0) differs = true;
					if (delta > maxDelta) maxDelta = delta;
				}
				if (differs) differing++;
			}
			return pairs[index].photo
				? {
						...sizes,
						differing,
						maxDelta,
						original: base64(a),
						webp: base64(b),
					}
				: { ...sizes, differing, maxDelta };
		} catch (error) {
			return { error: `${pairs[index].original}: ${String(error)}` };
		}
	});
}

function judge(pair: Pair, drawn: Drawn): Verdict {
	const { source } = pair;
	if ("error" in drawn) return { source, ok: false, detail: drawn.error };
	if (drawn.differing < 0)
		return {
			source,
			ok: false,
			detail: `drawn ${drawn.width}x${drawn.height} from the original, ${drawn.webpWidth}x${drawn.webpHeight} from the WebP`,
		};
	const counted = `${drawn.differing} of ${drawn.width * drawn.height} pixels differ (largest channel difference ${drawn.maxDelta})`;
	if (!pair.photo)
		return { source, ok: drawn.differing === 0, detail: counted };
	const image = (text: string | undefined) => ({
		width: drawn.width,
		height: drawn.height,
		data: new Uint8Array(Buffer.from(text ?? "", "base64")),
	});
	const original = image(drawn.original);
	const webp = image(drawn.webp);
	const psnr = {
		white: classicyPsnr(original, webp, "white"),
		black: classicyPsnr(original, webp, "black"),
	};
	return {
		source,
		ok:
			psnr.white >= CLASSICY_WEBP_PHOTO_FLOOR_DB &&
			psnr.black >= CLASSICY_WEBP_PHOTO_FLOOR_DB,
		detail: `${counted}; PSNR white ${formatClassicyPsnr(psnr.white)} dB, black ${formatClassicyPsnr(psnr.black)} dB (floor ${CLASSICY_WEBP_PHOTO_FLOOR_DB})`,
		psnr,
	};
}

const USAGE =
	"usage: node bin/check-webp-in-browsers.ts --browser chromium|firefox [--out-dir DIR] [path-prefix ...]\n";

async function main(argv: readonly string[]): Promise<number> {
	const root = CLASSICY_WEBP_REPO_ROOT;
	let outDir = root;
	let browserName: BrowserName | undefined;
	const prefixes: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--browser" && argv[i + 1] !== undefined) {
			const name = argv[++i];
			if (name !== "chromium" && name !== "firefox") {
				process.stderr.write(USAGE);
				return 2;
			}
			browserName = name;
		} else if (arg === "--out-dir" && argv[i + 1] !== undefined)
			outDir = resolve(argv[++i]);
		else if (arg.startsWith("--out-dir=")) outDir = resolve(arg.slice(10));
		else if (arg.startsWith("-")) {
			process.stderr.write(USAGE);
			return 2;
		} else prefixes.push(classicyWebpRepoPath(arg, root));
	}
	if (!browserName) {
		process.stderr.write(USAGE);
		return 2;
	}

	const scope = readClassicyWebpScope(root, prefixes);
	if (scope.problems.length > 0) {
		for (const problem of scope.problems)
			process.stderr.write(`check-webp-in-browsers: ${problem}\n`);
		return 2;
	}
	const sources = scope.files.filter(
		(source) => !CLASSICY_WEBP_KEEP_ORIGINAL.includes(source),
	);
	const verdicts: Verdict[] = [];
	const served = new Map<string, { file: string; type: string }>();
	const pairs: Pair[] = [];
	for (const source of sources) {
		const target = classicyWebpTarget(source);
		const webpFile = join(outDir, target);
		if (!existsSync(webpFile)) {
			verdicts.push({ source, ok: false, detail: `no WebP at ${webpFile}` });
			continue;
		}
		const original = urlPath("original", source);
		const webp = urlPath("webp", target);
		served.set(decodeURIComponent(original), {
			file: join(root, source),
			type: CONTENT_TYPES[source.slice(source.lastIndexOf("."))],
		});
		served.set(decodeURIComponent(webp), {
			file: webpFile,
			type: CONTENT_TYPES[".webp"],
		});
		pairs.push({
			source,
			original,
			webp,
			photo: CLASSICY_WEBP_PHOTOS.includes(source),
		});
	}

	const server = createServer((request, response) => {
		const path = decodeURIComponent(
			new URL(request.url ?? "/", "http://localhost").pathname,
		);
		if (path === "/") {
			response.writeHead(200, { "content-type": "text/html; charset=utf-8" });
			response.end(
				'<!doctype html><meta charset="utf-8"><title>WebP check</title>',
			);
			return;
		}
		const entry = served.get(path);
		if (!entry) {
			response.writeHead(404).end();
			return;
		}
		response.writeHead(200, {
			"content-type": entry.type,
			"cache-control": "no-store",
		});
		response.end(readFileSync(entry.file));
	});
	await new Promise<void>((done) => server.listen(0, "127.0.0.1", done));
	const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;

	let browser: Browser | undefined;
	try {
		const playwright = loadPlaywright();
		try {
			browser = await playwright[browserName].launch(
				browserName === "chromium" ? { args: [...PARITY_CHROMIUM_ARGS] } : {},
			);
		} catch (e) {
			throw new Error(
				`Playwright could not launch ${browserName}: ${String(e).split("\n")[0]}`,
			);
		}
		process.stdout.write(
			`${browserName} ${browser.version()}: ${pairs.length} pairs under ${outDir}\n`,
		);
		const page = await browser.newPage();
		await page.goto(`${base}/`);
		for (let start = 0; start < pairs.length; start += BATCH) {
			const batch = pairs.slice(start, start + BATCH);
			const drawn = await page.evaluate(
				drawPairs,
				batch.map(({ original, webp, photo }) => ({
					original: `${base}${original}`,
					webp: `${base}${webp}`,
					photo,
				})),
			);
			for (const [index, pair] of batch.entries())
				verdicts.push(judge(pair, drawn[index]));
			process.stdout.write(
				`  drew ${Math.min(start + BATCH, pairs.length)}/${pairs.length}\n`,
			);
		}
	} finally {
		await browser?.close();
		await new Promise<void>((done) => server.close(() => done()));
	}

	const failures = verdicts.filter((verdict) => !verdict.ok);
	for (const verdict of verdicts)
		if (verdict.psnr || !verdict.ok)
			process.stdout.write(
				`${verdict.ok ? "ok  " : "FAIL"}  ${verdict.source}: ${verdict.detail}\n`,
			);
	const photos = verdicts.filter((verdict) => verdict.psnr).length;
	process.stdout.write(
		`${browserName}: ${verdicts.length} images checked, ${verdicts.length - photos} non-photos and ${photos} photos; ${verdicts.length - failures.length} pass, ${failures.length} fail${CLASSICY_WEBP_KEEP_ORIGINAL.length > 0 ? `; ${scope.files.length - sources.length} kept in their original format, not checked` : ""}\n`,
	);
	return failures.length > 0 ? 1 : 0;
}

if (
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	main(process.argv.slice(2)).then(
		(code) => {
			process.exitCode = code;
		},
		(error: unknown) => {
			process.stderr.write(
				`check-webp-in-browsers: ${error instanceof Error ? error.message : String(error)}\n`,
			);
			process.exitCode = 2;
		},
	);
}
