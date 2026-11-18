import { spawnSync } from "node:child_process";
import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { syncClassicyPackageVersions } from "./syncPackageVersions.ts";

// Every Appearance Package ships at the core's version (push.yml syncs them
// on each bump on main). A branch that merges main between releases carries
// the new root version and the old package versions, so the manifest tests
// fail until they are synced: `pnpm sync:versions` does that.

const roots: string[] = [];
afterEach(() => {
	for (const root of roots.splice(0)) rmSync(root, { recursive: true });
});

const manifest = (name: string, version: string) =>
	`{\n\t"name": "${name}",\n\t"version": "${version}",\n\t"files": ["dist"],\n\t"peerDependencies": { "@classicy/classicy": "workspace:^" }\n}\n`;

/** A scratch repo: the root at `rootVersion`, one package per entry. */
const repo = (rootVersion: string, packages: Record<string, string>) => {
	const root = mkdtempSync(join(tmpdir(), "classicy-sync-versions-"));
	roots.push(root);
	writeFileSync(
		join(root, "package.json"),
		manifest("@classicy/classicy", rootVersion),
	);
	for (const [id, version] of Object.entries(packages)) {
		mkdirSync(join(root, "packages/appearance", id), { recursive: true });
		writeFileSync(
			join(root, "packages/appearance", id, "package.json"),
			manifest(`@classicy/appearance-${id}`, version),
		);
	}
	return root;
};

const read = (root: string, id: string) =>
	readFileSync(join(root, "packages/appearance", id, "package.json"), "utf8");

describe("syncClassicyPackageVersions", () => {
	it("sets every Appearance Package to the root's version, changing only that value", () => {
		const root = repo("3.4.2", { platinum: "3.4.2", system7: "3.4.1" });
		const changes = syncClassicyPackageVersions(root);
		expect(changes).toEqual([
			{
				file: "packages/appearance/system7/package.json",
				from: "3.4.1",
				to: "3.4.2",
			},
		]);
		expect(read(root, "system7")).toBe(
			manifest("@classicy/appearance-system7", "3.4.2"),
		);
		expect(read(root, "platinum")).toBe(
			manifest("@classicy/appearance-platinum", "3.4.2"),
		);
	});

	it("only reports in check mode, writing nothing", () => {
		const root = repo("3.5.0", { platinum: "3.4.2", system7: "3.4.2" });
		const changes = syncClassicyPackageVersions(root, { check: true });
		expect(changes.map((c) => c.file)).toEqual([
			"packages/appearance/platinum/package.json",
			"packages/appearance/system7/package.json",
		]);
		expect(read(root, "platinum")).toBe(
			manifest("@classicy/appearance-platinum", "3.4.2"),
		);
	});

	it("changes nothing when every package already matches", () => {
		const root = repo("3.4.2", { platinum: "3.4.2", system7: "3.4.2" });
		expect(syncClassicyPackageVersions(root)).toEqual([]);
	});
});

describe("the sync:versions command", () => {
	const cli = (root: string, ...args: string[]) =>
		spawnSync(
			process.execPath,
			[join(import.meta.dirname, "syncPackageVersions.ts"), ...args],
			{ cwd: root, encoding: "utf8" },
		);

	it("is the root script", () => {
		const scripts = JSON.parse(
			readFileSync(join(import.meta.dirname, "../package.json"), "utf8"),
		).scripts;
		expect(scripts["sync:versions"]).toBe("node bin/syncPackageVersions.ts");
	});

	it("names each change and exits 0", () => {
		const root = repo("3.4.2", { system7: "3.4.1" });
		const r = cli(root);
		expect(r.status, r.stderr).toBe(0);
		expect(r.stdout).toContain(
			"packages/appearance/system7/package.json: 3.4.1 -> 3.4.2",
		);
		expect(read(root, "system7")).toContain('"version": "3.4.2"');
	});

	it("with --check, exits 1 and names the fix when a package is behind", () => {
		const root = repo("3.4.2", { system7: "3.4.1" });
		const r = cli(root, "--check");
		expect(r.status).toBe(1);
		expect(r.stderr).toContain("pnpm sync:versions");
		expect(read(root, "system7")).toContain('"version": "3.4.1"');
	});
});
