// `pnpm sync:versions`: sets every Appearance Package
// (packages/appearance/<id>/package.json) to the root's version, the
// lockstep push.yml keeps on main with each bump. A branch that merges main
// between releases takes main's new root version but keeps its packages'
// old ones (main may have none of them to bump), so the manifest tests fail
// until this runs. `--check` only reports, exiting 1 when one is behind.
//
// Only each manifest's top-level `version` value changes: the rest of the
// file is kept byte for byte.

import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

export interface ClassicyPackageVersionChange {
	/** The manifest, relative to the repo root, with `/` separators. */
	file: string;
	from: string;
	to: string;
}

const versionOf = (file: string): string => {
	const version = JSON.parse(readFileSync(file, "utf8")).version;
	if (typeof version !== "string")
		throw new Error(`${file} has no string "version"`);
	return version;
};

// The top-level `"version": "…"` member: a tab or two-space indent, one level.
const VERSION_MEMBER = /^(\t| {2})"version"(\s*:\s*)"[^"]*"/m;

/** Sets `file`'s top-level version to `to`, keeping everything else. */
const writeVersion = (file: string, to: string) => {
	const source = readFileSync(file, "utf8");
	if (!VERSION_MEMBER.test(source))
		throw new Error(`${file}: no top-level "version" member to set`);
	const next = source.replace(VERSION_MEMBER, `$1"version"$2"${to}"`);
	const before = JSON.parse(source);
	const after = JSON.parse(next);
	if (
		after.version !== to ||
		JSON.stringify({ ...before, version: to }) !== JSON.stringify(after)
	)
		throw new Error(`${file}: setting "version" would change more than it`);
	writeFileSync(file, next);
};

/**
 * Brings every `packages/appearance/<id>/package.json` under `root` to the
 * root manifest's version and returns what changed (in check mode, what
 * would), sorted by path.
 */
export function syncClassicyPackageVersions(
	root: string,
	{ check = false }: { check?: boolean } = {},
): ClassicyPackageVersionChange[] {
	const to = versionOf(join(root, "package.json"));
	const packagesDir = join(root, "packages", "appearance");
	const changes: ClassicyPackageVersionChange[] = [];
	for (const entry of readdirSync(packagesDir, { withFileTypes: true }).sort(
		(a, b) => a.name.localeCompare(b.name),
	)) {
		if (!entry.isDirectory()) continue;
		const file = join(packagesDir, entry.name, "package.json");
		let from: string;
		try {
			from = versionOf(file);
		} catch (error) {
			if ((error as NodeJS.ErrnoException).code === "ENOENT") continue;
			throw error;
		}
		if (from === to) continue;
		if (!check) writeVersion(file, to);
		changes.push({
			file: relative(root, file).split("\\").join("/"),
			from,
			to,
		});
	}
	return changes;
}

if (
	process.argv[1] !== undefined &&
	import.meta.url === pathToFileURL(process.argv[1]).href
) {
	const check = process.argv.includes("--check");
	const root = process.cwd();
	const changes = syncClassicyPackageVersions(root, { check });
	for (const { file, from, to } of changes)
		console.log(`${file}: ${from} -> ${to}`);
	if (check && changes.length > 0) {
		console.error(
			"These Appearance Packages are behind the core's version; run `pnpm sync:versions`.",
		);
		process.exit(1);
	}
	if (changes.length === 0)
		console.log(
			`Every Appearance Package is at the core's version (${versionOf(join(root, "package.json"))}).`,
		);
}
