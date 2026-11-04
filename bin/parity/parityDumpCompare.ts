// Compare two sets of computed-style dumps (`parity dump`) or forced-state
// dumps (`parity forced`), file by file. Each dump is JSON keyed by
// `<index>:<TAG>.<classes><pseudo>`, each value a property -> value map.
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/** Where a dump was taken: the server origin and the checkout it served. */
export type ParityOrigin = { baseUrl: string; repo: string };
type Dump = Record<string, unknown>;

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Rewrite the dev server's origin, and the checkout path Vite serves source
 * through (`/@fs/<checkout>/`), to `ORIGIN/`, so a different port or worktree
 * is not a difference. With the dump's recorded origin the rewrite is exact;
 * without one (dumps from the older scripts) any local origin is rewritten,
 * and the path up to the first `src/`, `assets/` or `node_modules/`.
 */
export function normalizeParityUrls(
	text: string,
	origin?: ParityOrigin,
): string {
	if (origin) {
		const base = escapeRegExp(origin.baseUrl);
		return text
			.replace(
				new RegExp(`${base}/@fs${escapeRegExp(origin.repo)}/`, "g"),
				"ORIGIN/",
			)
			.replace(new RegExp(`${base}/`, "g"), "ORIGIN/");
	}
	return text.replace(
		/http:\/\/(?:localhost|127\.0\.0\.1):\d+\/(?:@fs\/[^"\s]*?\/(?=(?:src|assets|node_modules)\/))?/g,
		"ORIGIN/",
	);
}

const isObject = (v: unknown): v is Record<string, unknown> =>
	typeof v === "object" && v !== null && !Array.isArray(v);

const show = (v: unknown) => (typeof v === "string" ? v : JSON.stringify(v));

function diffElements(
	before: Dump,
	after: Dump,
	skip: (key: string) => boolean,
	ignoreProp: (key: string, prop: string) => boolean = () => false,
): string[] {
	const diffs: string[] = [];
	for (const key of [
		...new Set([...Object.keys(before), ...Object.keys(after)]),
	].sort()) {
		if (skip(key)) continue;
		if (!(key in before) || !(key in after)) {
			diffs.push(`${key}: element missing on one side`);
			continue;
		}
		const b = before[key];
		const a = after[key];
		if (isObject(b) && isObject(a) && !key.startsWith("__")) {
			for (const prop of [
				...new Set([...Object.keys(b), ...Object.keys(a)]),
			].sort()) {
				if (b[prop] === a[prop] || ignoreProp(key, prop)) continue;
				diffs.push(`${key} ${prop}: ${show(b[prop])} -> ${show(a[prop])}`);
			}
		} else if (JSON.stringify(b) !== JSON.stringify(a)) {
			diffs.push(`${key}: ${show(b)} -> ${show(a)}`);
		}
	}
	return diffs;
}

/** Computed dumps: every element and property must match. `__html` (the
 * root's markup length) is reported apart, `__origin` is metadata, and the
 * desktop icon image's margins are layout-dependent noise that flips between
 * runs. */
export const compareComputedDumps = (before: Dump, after: Dump) =>
	diffElements(
		before,
		after,
		(k) => k === "__html" || k === "__origin",
		(k, p) =>
			k.includes("DIV.classicyDesktopIconImage") && p.startsWith("margin"),
	);

/** Forced dumps: everything but `__matchedPseudo`, which lists the matched
 * pseudo-element rules and moves with any stylesheet text change, and the
 * `__origin` metadata. */
export const compareForcedDumps = (before: Dump, after: Dump) =>
	diffElements(
		before,
		after,
		(k) => k === "__matchedPseudo" || k === "__origin",
	);

const readDump = (file: string): Dump => {
	const raw = readFileSync(file, "utf8");
	const origin = (JSON.parse(raw) as { __origin?: ParityOrigin }).__origin;
	return JSON.parse(normalizeParityUrls(raw, origin)) as Dump;
};

const jsonNames = (dir: string, filter?: RegExp) =>
	readdirSync(dir)
		.filter((f) => f.endsWith(".json"))
		.map((f) => f.slice(0, -5))
		.filter((n) => !filter || filter.test(n));

export type ParityDumpReport = {
	lines: string[];
	failures: string[];
	ok: boolean;
};

export function compareDumpDirs(
	beforeDir: string,
	afterDir: string,
	kind: "computed" | "forced",
	filter?: RegExp,
): ParityDumpReport {
	for (const d of [beforeDir, afterDir])
		if (!existsSync(d)) throw new Error(`no such directory: ${d}`);
	const compare =
		kind === "computed" ? compareComputedDumps : compareForcedDumps;
	const before = new Set(jsonNames(beforeDir, filter));
	const after = new Set(jsonNames(afterDir, filter));
	const lines: string[] = [];
	const failures: string[] = [];
	const htmlDeltas = new Map<number, number>();
	let same = 0;
	let differ = 0;
	let missing = 0;
	const names = [...new Set([...before, ...after])].sort();
	for (const name of names) {
		if (!before.has(name) || !after.has(name)) {
			missing++;
			const line = `MISSING-IN-${before.has(name) ? "AFTER" : "BEFORE"} ${name}`;
			lines.push(line);
			failures.push(line);
			continue;
		}
		const b = readDump(join(beforeDir, `${name}.json`));
		const a = readDump(join(afterDir, `${name}.json`));
		if (kind === "computed") {
			const delta = Number(a.__html ?? 0) - Number(b.__html ?? 0);
			htmlDeltas.set(delta, (htmlDeltas.get(delta) ?? 0) + 1);
		}
		const diffs = compare(b, a);
		if (diffs.length === 0) {
			same++;
			lines.push(`SAME ${name}`);
			continue;
		}
		differ++;
		const head = `DIFF ${name} (${diffs.length})`;
		const body = diffs.slice(0, 20).map((d) => `    ${d}`);
		if (diffs.length > 20) body.push(`    ... ${diffs.length - 20} more`);
		lines.push(head, ...body);
		failures.push(head, ...body.slice(0, 8));
	}
	if (kind === "computed")
		lines.push(
			`__html deltas (after - before, chars -> count): ${JSON.stringify(Object.fromEntries(htmlDeltas))}`,
		);
	lines.push(
		`SUMMARY total ${names.length} identical ${same} differ ${differ} missing ${missing}`,
	);
	return { lines, failures, ok: names.length > 0 && same === names.length };
}
