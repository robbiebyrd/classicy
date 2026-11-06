// Screenshot parity: ImageMagick `compare -metric AE` (the absolute count of
// differing pixels, no fuzz) for every PNG in an "after" set against the PNG
// of the same name in a "before" set. AE 0 means pixel-identical.
import { spawnSync } from "node:child_process";
import {
	closeSync,
	existsSync,
	openSync,
	readdirSync,
	readSync,
} from "node:fs";
import { join } from "node:path";

export type ParityAeResult = {
	/** The shot's name: its file name without `.png` (a story id, or app-*). */
	name: string;
	ae?: number;
	/** The side that lacks the shot. */
	missing?: "before" | "after";
	/** ImageMagick's message when it could not compare (different sizes, say). */
	error?: string;
};

export type ParityAeSummary = {
	lines: string[];
	/** The lines that are not AE 0, in order. */
	failures: string[];
	ok: boolean;
};

type Run = (
	cmd: string,
	args: readonly string[],
) => {
	status: number | null;
	stdout: string;
	stderr: string;
	error?: Error;
};

const run: Run = (cmd, args) => {
	const r = spawnSync(cmd, [...args], { encoding: "utf8" });
	return {
		status: r.status,
		stdout: r.stdout,
		stderr: r.stderr,
		error: r.error,
	};
};

/** The command that runs ImageMagick's compare: `compare` (ImageMagick 6, or 7
 * with its legacy names), else `magick compare`. Throws when neither exists. */
export function findImageMagickCompare(runner: Run = run): string[] {
	for (const cmd of [["compare"], ["magick", "compare"]]) {
		const r = runner(cmd[0], ["-version"]);
		if (!r.error && r.status === 0 && /ImageMagick/.test(r.stdout + r.stderr))
			return cmd;
	}
	throw new Error(
		"ImageMagick's `compare` was not found on PATH (tried `compare` and `magick compare`). " +
			"Install ImageMagick (apt-get install imagemagick, or brew install imagemagick) and retry.",
	);
}

/** The pixel count from compare's stderr: `123` (ImageMagick 6) or
 * `123 (0.00187)` (ImageMagick 7). Null when it printed an error instead. */
export function parseAeOutput(text: string): number | null {
	const first = text.trim().split(/\s+/)[0] ?? "";
	if (!/^[0-9.]+(?:e[+-]?[0-9]+)?$/i.test(first)) return null;
	return Math.round(Number(first));
}

export function summarizeAe(
	results: readonly ParityAeResult[],
): ParityAeSummary {
	const lines: string[] = [];
	const failures: string[] = [];
	let zero = 0;
	let nonzero = 0;
	let missing = 0;
	let errors = 0;
	for (const r of results) {
		let line: string;
		if (r.missing) {
			missing++;
			line = `MISSING-IN-${r.missing.toUpperCase()} ${r.name}`;
		} else if (r.error !== undefined || r.ae === undefined) {
			errors++;
			line = `ERROR ${r.name} ${r.error ?? "no result"}`;
		} else {
			line = `${r.ae} ${r.name}`;
			if (r.ae === 0) zero++;
			else nonzero++;
		}
		lines.push(line);
		if (r.ae !== 0) failures.push(line);
	}
	lines.push(
		`SUMMARY total ${results.length} zero ${zero} nonzero ${nonzero} missing ${missing} errors ${errors}`,
	);
	return {
		lines,
		failures,
		ok: results.length > 0 && zero === results.length,
	};
}

const PNG_SIGNATURE = Buffer.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

/** A PNG's width and height from its IHDR chunk; null when it is not a PNG. */
export function pngSize(
	head: Buffer,
): { width: number; height: number } | null {
	if (head.length < 24 || !head.subarray(0, 8).equals(PNG_SIGNATURE))
		return null;
	if (head.toString("ascii", 12, 16) !== "IHDR") return null;
	return { width: head.readUInt32BE(16), height: head.readUInt32BE(20) };
}

const readPngSize = (file: string) => {
	const fd = openSync(file, "r");
	try {
		const head = Buffer.alloc(24);
		readSync(fd, head, 0, 24, 0);
		const size = pngSize(head);
		return size ? `${size.width}x${size.height}` : "not-a-png";
	} finally {
		closeSync(fd);
	}
};

const pngNames = (dir: string, filter?: RegExp) =>
	existsSync(dir)
		? readdirSync(dir)
				.filter((f) => f.endsWith(".png"))
				.map((f) => f.slice(0, -4))
				.filter((n) => !filter || filter.test(n))
		: [];

/** AE for every PNG in either directory, sorted by name. */
export function compareAeDirs(
	beforeDir: string,
	afterDir: string,
	filter?: RegExp,
	compareCommand?: readonly string[],
	runner: Run = run,
): ParityAeResult[] {
	// The directories are checked before ImageMagick is looked up, so a
	// missing directory is reported as such on a machine without ImageMagick.
	if (!existsSync(beforeDir))
		throw new Error(`no such directory: ${beforeDir}`);
	if (!existsSync(afterDir)) throw new Error(`no such directory: ${afterDir}`);
	const compare = compareCommand ?? findImageMagickCompare();
	const before = new Set(pngNames(beforeDir, filter));
	const after = new Set(pngNames(afterDir, filter));
	return [...new Set([...before, ...after])].sort().map((name) => {
		if (!before.has(name)) return { name, missing: "before" };
		if (!after.has(name)) return { name, missing: "after" };
		const b = join(beforeDir, `${name}.png`);
		const a = join(afterDir, `${name}.png`);
		// ImageMagick 6 answers AE 0 for images of different sizes (it runs a
		// subimage search instead), so the sizes are checked first.
		const sizes = [readPngSize(b), readPngSize(a)];
		if (sizes[0] !== sizes[1])
			return {
				name,
				error: `size differs: ${sizes[0]} before, ${sizes[1]} after`,
			};
		const r = runner(compare[0], [
			...compare.slice(1),
			"-metric",
			"AE",
			b,
			a,
			"null:",
		]);
		// compare exits 0 (same) or 1 (different) with the metric on stderr,
		// and 2 on an error such as images of different sizes.
		const ae =
			r.status === 0 || r.status === 1 ? parseAeOutput(r.stderr) : null;
		return ae === null
			? { name, error: (r.stderr || String(r.error)).trim().split("\n")[0] }
			: { name, ae };
	});
}
