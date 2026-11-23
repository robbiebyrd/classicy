// The one-time PNG and JPG to WebP conversion (plan 0019-fb7 Part 5, §6.2).
// Every tracked file the CLASSICY_WEBP_SCOPE globs match is decoded and
// encoded by bin/classicyWebp.ts, the pinned WebAssembly libwebp, so a rerun
// writes the same bytes on any machine:
//
//   node bin/convert-images-to-webp.ts [--out-dir DIR] [path-prefix ...]
//
// - Each source becomes classicyWebpTarget(source): the same folder and stem
//   with a .webp extension (Platinum's wallpapers/default.jpg becomes
//   default_photo.webp, since default.png takes default.webp). It is written
//   beside the source, or at DIR/<the same repo-relative path> with
//   --out-dir, so a trial run leaves the source tree alone.
// - Path prefixes (folders or files, repo-relative or absolute) limit the run
//   to the in-scope files under them.
// - Lossless with `exact` by default. The two photos (CLASSICY_WEBP_PHOTOS)
//   go lossy at CLASSICY_WEBP_PHOTO_QUALITY only when that scores at least
//   CLASSICY_WEBP_PHOTO_FLOOR_DB of PSNR over white and over black and is
//   smaller than the lossless file (chooseClassicyWebpEncoding).
// - A PNG with gAMA and no sRGB chunk (in scope Platinum's art/sad-mac.png
//   and earth.png, both with cHRM too), which Chromium color-manages, gets
//   the ICC profile its chunks stand for (classicyIccFromPngChunks), muxed in
//   as VP8X plus ICCP, so its WebP draws as the PNG does, not as plain sRGB.
// - Every lossless output must decode to its source's pixels exactly, all four
//   channels (earth.png, 16-bit, against its samples rounded to 8 bits).
// - A source in CLASSICY_WEBP_KEEP_ORIGINAL (a non-photo the browser check,
//   bin/check-webp-in-browsers.ts, found drawn differently) is skipped, and a
//   WebP written for it earlier is deleted, only when git does not track it
//   (removeClassicyStaleWebp): a tracked file at the target is refused, since
//   tracked files leave the tree only through `git rm`.
//
// It prints a line per file as it goes, then a table (source, bytes, WebP
// bytes, mode, PSNR) and the totals per package. Exit codes: 0 when every
// file converted, 1 when a lossless output differs from its source (that
// file is not written) or a kept original's target is a tracked file (left
// in place), 2 on a usage or environment error, a scope glob or a prefix
// selecting no file included.
//
// Build script, not library code: it reports through stdout/stderr. Erasable
// TypeScript only, so Node runs it directly.
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { dirname, isAbsolute, join, relative, resolve, sep } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
	classicyIccFromPngChunks,
	classicyPixelsEqual,
	classicyPsnr,
	decodeClassicySourceImage,
	decodeClassicyWebp,
	encodeClassicyWebp,
	withClassicyIccProfile,
} from "./classicyWebp.ts";

/** The files converted, as repo-relative globs (`*`, `**\/` and `{a,b}`). */
export const CLASSICY_WEBP_SCOPE: readonly string[] = [
	"packages/appearance/platinum/src/assets/art/*.png",
	"packages/appearance/platinum/src/assets/wallpapers/*.{png,jpg}",
	"packages/appearance/system7/src/assets/art/**/*.png",
	"packages/appearance/system7/src/assets/icons/**/*.png",
	"packages/appearance/system7/src/assets/wallpapers/*.png",
	"assets/img/ui/earth.png",
];

/** The photographs, which may go lossy. */
export const CLASSICY_WEBP_PHOTOS: readonly string[] = [
	"packages/appearance/platinum/src/assets/wallpapers/default.jpg",
	"assets/img/ui/earth.png",
];

export const CLASSICY_WEBP_PHOTO_QUALITY = 90;

/** A lossy photo must score at least this PSNR, in dB, over white and black. */
export const CLASSICY_WEBP_PHOTO_FLOOR_DB = 45;

/**
 * In-scope sources that stay in their own format: a non-photo the browser
 * check found drawn differently from its WebP, even with an ICC profile.
 */
export const CLASSICY_WEBP_KEEP_ORIGINAL: readonly string[] = [
	// Its nine translucent pixels: Chromium 143 draws seven of them one level
	// darker from the WebP, over any background. Its WebP decoder rounds the
	// premultiplied color (c·α/255) down where its PNG decoder rounds it to
	// nearest: the seven are exactly those where the two differ. No color
	// chunk is involved, so no profile helps. Firefox draws both alike.
	"packages/appearance/platinum/src/assets/art/alias.png",
];

const SOURCE_EXTENSION = /\.(?:png|jpg)$/;

/** Where a source's WebP goes: its folder and stem, with `.webp`. */
export function classicyWebpTarget(source: string): string {
	if (!SOURCE_EXTENSION.test(source))
		throw new RangeError(`classicyWebpTarget: ${source} is not a PNG or JPG`);
	// Platinum's wallpapers hold both default.png and default.jpg.
	if (
		source === "wallpapers/default.jpg" ||
		source.endsWith("/wallpapers/default.jpg")
	)
		return source.replace(/default\.jpg$/, "default_photo.webp");
	return source.replace(SOURCE_EXTENSION, ".webp");
}

export type ClassicyWebpCandidates = {
	losslessBytes: number;
	lossyBytes: number;
	/** The lossy file's PSNR against the source, composited over white. */
	psnrWhite: number;
	/** The same over black. */
	psnrBlack: number;
};

/** Lossy only at or above the floor on both backgrounds, and only if smaller. */
export function chooseClassicyWebpEncoding({
	losslessBytes,
	lossyBytes,
	psnrWhite,
	psnrBlack,
}: ClassicyWebpCandidates): "lossless" | "lossy" {
	return psnrWhite >= CLASSICY_WEBP_PHOTO_FLOOR_DB &&
		psnrBlack >= CLASSICY_WEBP_PHOTO_FLOOR_DB &&
		lossyBytes < losslessBytes
		? "lossy"
		: "lossless";
}

const escapeRegExp = (text: string) =>
	text.replace(/[.*+?^${}()|[\]\\/]/g, "\\$&");

/** A scope glob as a RegExp: `*` within a name, `**\/` across folders. */
function globRegExp(glob: string): RegExp {
	let pattern = "";
	for (let i = 0; i < glob.length; i++) {
		if (glob.startsWith("**/", i)) {
			pattern += "(?:[^/]+/)*";
			i += 2;
		} else if (glob[i] === "*") {
			pattern += "[^/]*";
		} else if (glob[i] === "{") {
			const end = glob.indexOf("}", i);
			const choices = glob.slice(i + 1, end).split(",");
			pattern += `(?:${choices.map(escapeRegExp).join("|")})`;
			i = end;
		} else {
			pattern += escapeRegExp(glob[i]);
		}
	}
	return new RegExp(`^${pattern}$`);
}

/** The folder a glob starts from: its segments before the first wildcard. */
function globBase(glob: string): string {
	const segments = glob.split("/");
	const wild = segments.findIndex((segment) => /[*{]/.test(segment));
	return (wild === -1 ? segments : segments.slice(0, wild)).join("/");
}

const isWithin = (path: string, prefix: string) =>
	path === prefix || path.startsWith(`${prefix}/`);

export type ClassicyWebpScope = {
	/** The selected sources, glob by glob, each glob's sorted. */
	files: string[];
	/** How many of the selected sources each glob matched. */
	perGlob: { glob: string; count: number }[];
	/** A glob or prefix that selects nothing, as a sentence each. */
	problems: string[];
};

/**
 * The in-scope files among `tracked` (repo-relative, `/`-separated), or only
 * those under `prefixes`. With no prefix every glob must match a file; with
 * prefixes every glob inside one must, and every prefix must select one.
 */
export function classicyWebpScopeFiles(
	tracked: readonly string[],
	prefixes: readonly string[] = [],
): ClassicyWebpScope {
	const wanted = prefixes.map((prefix) =>
		prefix.replace(/^(?:\.\/)+/, "").replace(/\/+$/, ""),
	);
	const selected = (file: string) =>
		wanted.length === 0 || wanted.some((prefix) => isWithin(file, prefix));
	const files: string[] = [];
	const problems: string[] = [];
	const perGlob = CLASSICY_WEBP_SCOPE.map((glob) => {
		const re = globRegExp(glob);
		const matched = tracked.filter((file) => re.test(file)).sort();
		const base = globBase(glob);
		if (
			matched.length === 0 &&
			(wanted.length === 0 || wanted.some((prefix) => isWithin(base, prefix)))
		)
			problems.push(`${glob} matches no tracked file`);
		const chosen = matched.filter(
			(file) => selected(file) && !files.includes(file),
		);
		files.push(...chosen);
		return { glob, count: chosen.length };
	});
	for (const prefix of wanted)
		if (!files.some((file) => isWithin(file, prefix)))
			problems.push(`no in-scope file lies under ${prefix}`);
	return { files, perGlob, problems };
}

/** The repository's root, this file's parent folder. */
export const CLASSICY_WEBP_REPO_ROOT = fileURLToPath(
	new URL("..", import.meta.url),
);

/** A command-line path as a repo-relative, `/`-separated one. */
export function classicyWebpRepoPath(arg: string, root: string): string {
	const path = relative(root, resolve(arg)).split(sep).join("/");
	if (path.startsWith("..") || isAbsolute(path))
		throw new RangeError(`${arg} lies outside the repository`);
	return path;
}

/** The in-scope tracked files under `prefixes`, read from `git ls-files`. */
export function readClassicyWebpScope(
	root: string,
	prefixes: readonly string[],
): ClassicyWebpScope {
	const bases = [...new Set(CLASSICY_WEBP_SCOPE.map(globBase))];
	const listed = spawnSync("git", ["ls-files", "-z", "--", ...bases], {
		cwd: root,
		encoding: "utf8",
		maxBuffer: 64 * 1024 * 1024,
	});
	if (listed.status !== 0)
		throw new Error(`git ls-files failed:\n${listed.stderr}`);
	return classicyWebpScopeFiles(
		listed.stdout.split("\0").filter(Boolean),
		prefixes,
	);
}

/** The package a repo-relative path belongs to, for the totals. */
export function classicyWebpPackageOf(path: string): string {
	const match = /^packages\/appearance\/([^/]+)\//.exec(path);
	return match ? match[1] : "core";
}

/** Whether git tracks the file at `path` (absolute) in the repository at `root`. */
export function isClassicyTrackedFile(root: string, path: string): boolean {
	const inRepo = relative(root, path);
	if (inRepo.startsWith("..") || isAbsolute(inRepo)) return false;
	const listed = spawnSync(
		"git",
		["ls-files", "--error-unmatch", "--", inRepo],
		{ cwd: root, encoding: "utf8" },
	);
	if (listed.status === 0) return true;
	if (listed.status === 1) return false;
	throw new Error(
		`git ls-files --error-unmatch ${inRepo} failed:\n${listed.stderr}`,
	);
}

/**
 * Deletes the WebP an earlier run wrote for a source now kept in its own
 * format: only an untracked `.webp`. Anything else at `path`, a file git
 * tracks above all, is left alone and reported as refused.
 */
export function removeClassicyStaleWebp(
	root: string,
	path: string,
): "absent" | "deleted" | "refused" {
	if (!existsSync(path)) return "absent";
	if (!path.endsWith(".webp") || isClassicyTrackedFile(root, path))
		return "refused";
	rmSync(path);
	return "deleted";
}

export const formatClassicyPsnr = (db: number) =>
	db === Infinity ? "inf" : db.toFixed(2);

type Converted = {
	source: string;
	target: string;
	sourceBytes: number;
	webpBytes: number;
	/** REFUSED: a kept original whose target is a tracked file, left alone. */
	mode: "lossless" | "lossy" | "kept" | "DIFFERS" | "REFUSED";
	/** Whether the WebP carries an ICC profile (classicyIccFromPngChunks). */
	icc?: boolean;
	/** The lossy candidate's PSNR, for a photo. */
	psnr?: { white: number; black: number };
	seconds: number;
};

async function convert(
	root: string,
	outDir: string,
	source: string,
): Promise<Converted> {
	const started = performance.now();
	const target = classicyWebpTarget(source);
	const destination = join(outDir, target);
	const bytes = new Uint8Array(readFileSync(join(root, source)));
	const done = (rest: Omit<Converted, "source" | "target" | "seconds">) => ({
		source,
		target,
		seconds: (performance.now() - started) / 1000,
		...rest,
	});
	if (CLASSICY_WEBP_KEEP_ORIGINAL.includes(source)) {
		const removed = removeClassicyStaleWebp(root, destination);
		return done({
			sourceBytes: bytes.length,
			webpBytes: 0,
			mode: removed === "refused" ? "REFUSED" : "kept",
		});
	}

	let image: ReturnType<typeof decodeClassicySourceImage>;
	try {
		image = decodeClassicySourceImage(
			bytes,
			source.endsWith(".jpg") ? "jpg" : "png",
		);
	} catch (e) {
		throw new Error(`${source}: ${e instanceof Error ? e.message : e}`);
	}
	const lossless = await encodeClassicyWebp(image, { lossless: true });
	let chosen = lossless;
	let mode: Converted["mode"] = "lossless";
	let psnr: Converted["psnr"];
	if (CLASSICY_WEBP_PHOTOS.includes(source)) {
		const lossy = await encodeClassicyWebp(image, {
			lossless: false,
			quality: CLASSICY_WEBP_PHOTO_QUALITY,
		});
		const drawn = await decodeClassicyWebp(lossy);
		psnr = {
			white: classicyPsnr(image, drawn, "white"),
			black: classicyPsnr(image, drawn, "black"),
		};
		const choice = chooseClassicyWebpEncoding({
			losslessBytes: lossless.length,
			lossyBytes: lossy.length,
			psnrWhite: psnr.white,
			psnrBlack: psnr.black,
		});
		if (choice === "lossy") {
			chosen = lossy;
			mode = "lossy";
		}
	}
	// A PNG the browser color-manages (gAMA and cHRM, no sRGB) carries the
	// profile those chunks stand for, so its WebP draws the same.
	const icc = source.endsWith(".png")
		? classicyIccFromPngChunks(bytes)
		: undefined;
	if (icc) chosen = withClassicyIccProfile(chosen, icc);
	if (
		mode === "lossless" &&
		!classicyPixelsEqual(await decodeClassicyWebp(chosen), image)
	)
		return done({
			sourceBytes: bytes.length,
			webpBytes: chosen.length,
			mode: "DIFFERS",
			icc: Boolean(icc),
			psnr,
		});
	mkdirSync(dirname(destination), { recursive: true });
	writeFileSync(destination, chosen);
	return done({
		sourceBytes: bytes.length,
		webpBytes: chosen.length,
		mode,
		icc: Boolean(icc),
		psnr,
	});
}

const modeColumn = (row: Converted) => `${row.mode}${row.icc ? "+ICC" : ""}`;

const psnrColumn = (row: Converted) => {
	if (row.mode === "kept" || row.mode === "REFUSED") return "-";
	if (row.psnr) {
		const scores = `white ${formatClassicyPsnr(row.psnr.white)} dB, black ${formatClassicyPsnr(row.psnr.black)} dB`;
		return `q${CLASSICY_WEBP_PHOTO_QUALITY} ${scores}`;
	}
	return row.mode === "DIFFERS" ? "pixels differ" : "identical";
};

function printTable(rows: readonly Converted[]) {
	const table = [
		["source", "bytes", "WebP bytes", "mode", "PSNR"],
		...rows.map((row) => [
			row.source,
			String(row.sourceBytes),
			row.mode === "kept" || row.mode === "REFUSED"
				? "-"
				: String(row.webpBytes),
			modeColumn(row),
			psnrColumn(row),
		]),
	];
	const widths = table[0].map((_, column) =>
		Math.max(...table.map((cells) => cells[column].length)),
	);
	const numeric = new Set([1, 2]);
	for (const cells of table)
		process.stdout.write(
			`${cells
				.map((cell, column) =>
					numeric.has(column)
						? cell.padStart(widths[column])
						: cell.padEnd(widths[column]),
				)
				.join("  ")
				.trimEnd()}\n`,
		);
}

function printTotals(rows: readonly Converted[]) {
	const totals = new Map<
		string,
		{ files: number; sourceBytes: number; webpBytes: number }
	>();
	for (const row of rows) {
		if (row.mode !== "lossless" && row.mode !== "lossy") continue;
		const name = classicyWebpPackageOf(row.source);
		const total = totals.get(name) ?? {
			files: 0,
			sourceBytes: 0,
			webpBytes: 0,
		};
		total.files++;
		total.sourceBytes += row.sourceBytes;
		total.webpBytes += row.webpBytes;
		totals.set(name, total);
	}
	for (const [name, total] of totals) {
		const saved = 100 * (1 - total.webpBytes / total.sourceBytes);
		process.stdout.write(
			`${name}: ${total.files} files, ${total.sourceBytes} B as PNG/JPG, ${total.webpBytes} B as WebP (${saved.toFixed(1)}% smaller)\n`,
		);
	}
}

const USAGE =
	"usage: node bin/convert-images-to-webp.ts [--out-dir DIR] [path-prefix ...]\n";

async function main(argv: readonly string[]): Promise<number> {
	const root = CLASSICY_WEBP_REPO_ROOT;
	let outDir = root;
	const prefixes: string[] = [];
	for (let i = 0; i < argv.length; i++) {
		const arg = argv[i];
		if (arg === "--out-dir" && argv[i + 1] !== undefined)
			outDir = resolve(argv[++i]);
		else if (arg.startsWith("--out-dir=")) outDir = resolve(arg.slice(10));
		else if (arg.startsWith("-")) {
			process.stderr.write(USAGE);
			return 2;
		} else prefixes.push(classicyWebpRepoPath(arg, root));
	}

	const scope = readClassicyWebpScope(root, prefixes);
	for (const { glob, count } of scope.perGlob)
		process.stdout.write(`${String(count).padStart(4)}  ${glob}\n`);
	if (scope.problems.length > 0) {
		for (const problem of scope.problems)
			process.stderr.write(`convert-images-to-webp: ${problem}\n`);
		return 2;
	}
	process.stdout.write(
		`${scope.files.length} files in scope, writing under ${outDir}\n`,
	);

	const rows: Converted[] = [];
	const width = String(scope.files.length).length;
	for (const [index, source] of scope.files.entries()) {
		const row = await convert(root, outDir, source);
		rows.push(row);
		const counter = `[${String(index + 1).padStart(width)}/${scope.files.length}]`;
		process.stdout.write(
			row.mode === "kept" || row.mode === "REFUSED"
				? `${counter} ${row.source}  ${row.sourceBytes} B  kept in its own format (${row.mode === "kept" ? `no ${row.target}` : `REFUSED: ${row.target} is tracked or not a WebP, left in place`})\n`
				: `${counter} ${row.source} -> ${row.target}  ${row.sourceBytes} B -> ${row.webpBytes} B  ${modeColumn(row)}  ${psnrColumn(row)}  ${row.seconds.toFixed(2)} s\n`,
		);
	}

	process.stdout.write("\n");
	printTable(rows);
	process.stdout.write("\n");
	printTotals(rows);
	const written = rows.filter(
		(row) => row.mode === "lossless" || row.mode === "lossy",
	);
	const kept = rows.filter((row) => row.mode === "kept");
	const differs = rows.filter((row) => row.mode === "DIFFERS");
	const refused = rows.filter((row) => row.mode === "REFUSED");
	process.stdout.write(
		`${written.length} written (${written.filter((row) => row.mode === "lossy").length} lossy), ${kept.length + refused.length} kept in their original format, ${differs.length} differing, ${refused.length} refused\n`,
	);
	for (const row of differs)
		process.stderr.write(
			`convert-images-to-webp: ${row.source}'s lossless WebP does not decode to its pixels; not written\n`,
		);
	for (const row of refused)
		process.stderr.write(
			`convert-images-to-webp: ${join(outDir, row.target)} is tracked by git (or not a .webp); not deleting it for ${row.source}, kept in its own format. Remove it with git rm.\n`,
		);
	return differs.length > 0 || refused.length > 0 ? 1 : 0;
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
				`convert-images-to-webp: ${error instanceof Error ? error.message : String(error)}\n`,
			);
			process.exitCode = 2;
		},
	);
}
