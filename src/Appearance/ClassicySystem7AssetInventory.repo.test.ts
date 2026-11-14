import { existsSync, globSync, readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { ClassicyAssetTree } from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

/**
 * The System 7 asset inventory (plan 0018-dbd §2.1) is the list the owner
 * exports System 7.5's icons, art, cursors and sounds from. It must name every
 * icon key, system-art key and cursor role the core reads, each with a
 * decision, so a key added later cannot be forgotten: this test reads the
 * keys from the code (the core icon tree, the `ClassicySystemArtKey` and
 * `ClassicyCursorRole` unions, every literal icon read) and the rows from the
 * document's tables.
 */

const REPO_ROOT = path.resolve(
	path.dirname(fileURLToPath(import.meta.url)),
	"../..",
);
const INVENTORY = path.join(REPO_ROOT, "docs/system7-asset-inventory.md");
const REGISTRY = path.join(
	REPO_ROOT,
	"src/Appearance/ClassicyAssetRegistry.ts",
);

type Row = Record<string, string>;

/** The members of a string-literal union type declared in `source`. */
const unionMembers = (source: string, typeName: string): string[] => {
	const match = new RegExp(`export type ${typeName} =([^;]+);`).exec(source);
	if (!match?.[1]) throw new Error(`${typeName} not found`);
	return [...match[1].matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? "");
};

const iconLeaves = (tree: ClassicyAssetTree, trail = ""): string[] =>
	Object.entries(tree).flatMap(([key, value]) => {
		const keyPath = trail ? `${trail}.${key}` : key;
		return typeof value === "string" ? [keyPath] : iconLeaves(value, keyPath);
	});

/** `system.files._1292` → `system-files-1292`, `pickerCmyk` → `picker-cmyk`. */
const kebab = (key: string): string =>
	key
		.split(".")
		.map((segment) =>
			segment
				.replace(/^_+/, "")
				.replace(/([a-z0-9])([A-Z])/g, "$1-$2")
				.replace(/([a-zA-Z])(\d)/g, "$1-$2")
				.toLowerCase(),
		)
		.join("-");

/** The text under a `## <title>` heading, up to the next `## ` heading. */
const section = (doc: string, title: string): string => {
	const start = doc.indexOf(`\n## ${title}\n`);
	if (start < 0) throw new Error(`no "## ${title}" section`);
	const end = doc.indexOf("\n## ", start + 1);
	return doc.slice(start, end < 0 ? undefined : end);
};

const cells = (line: string): string[] =>
	line
		.trim()
		.replace(/^\||\|$/g, "")
		.split("|")
		.map((cell) => cell.trim());

/** Every row of every table in `text` whose header has a `keyColumn`. */
const tableRows = (text: string, keyColumn: string): Row[] => {
	const rows: Row[] = [];
	let header: string[] | undefined;
	for (const line of text.split("\n")) {
		if (!line.trim().startsWith("|")) {
			header = undefined;
			continue;
		}
		const row = cells(line);
		if (!header) {
			header = row;
			continue;
		}
		if (row.every((cell) => /^:?-+:?$/.test(cell))) continue;
		if (!header.includes(keyColumn)) continue;
		rows.push(
			Object.fromEntries(header.map((name, i) => [name, row[i] ?? ""])),
		);
	}
	return rows;
};

/** The backticked name in a cell: "`system.mac`" → "system.mac". */
const code = (cell: string | undefined): string =>
	/`([^`]+)`/.exec(cell ?? "")?.[1] ?? "";

const keysOf = (rows: Row[], column: string): string[] =>
	rows.map((row) => code(row[column]));

const duplicates = (keys: string[]): string[] =>
	keys.filter((key, i) => keys.indexOf(key) !== i);

const doc = existsSync(INVENTORY) ? readFileSync(INVENTORY, "utf8") : "";
const registrySource = readFileSync(REGISTRY, "utf8");

describe("System 7 asset inventory", () => {
	it("exists", () => {
		expect(existsSync(INVENTORY)).toBe(true);
	});

	describe("icons", () => {
		const rows = () => tableRows(section(doc, "Icons"), "Key");
		const treeKeys = iconLeaves(ClassicyIcons);

		it("lists every leaf of the core icon tree, once, and nothing else", () => {
			const listed = keysOf(rows(), "Key");
			expect(treeKeys.length).toBeGreaterThan(250);
			expect(duplicates(listed)).toEqual([]);
			expect(treeKeys.filter((key) => !listed.includes(key))).toEqual([]);
			expect(listed.filter((key) => !treeKeys.includes(key))).toEqual([]);
		});

		it("lists every icon key a bundled app or component reads by name", () => {
			const files = globSync(
				["src/**/*.{ts,tsx}", "packages/appearance/*/src/**/*.{ts,tsx}"],
				{ cwd: REPO_ROOT },
			).filter(
				(file) =>
					!/\.(test|stories)\.tsx?$/.test(file) && !file.includes("__tests__"),
			);
			const read = new Set<string>();
			for (const file of files) {
				// Comments hold usage examples (`myApp.icon`), not reads.
				const text = readFileSync(path.join(REPO_ROOT, file), "utf8")
					.replace(/\/\*[\s\S]*?\*\//g, "")
					.replace(/^\s*\/\/.*$/gm, "");
				for (const m of text.matchAll(
					/(?:useClassicyAsset|resolveClassicyAsset)\(\s*"icons",\s*"([^"]+)"/g,
				))
					read.add(m[1] ?? "");
			}
			expect(read.size).toBeGreaterThan(10);
			const listed = keysOf(rows(), "Key");
			expect([...read].filter((key) => !listed.includes(key))).toEqual([]);
		});

		it("gives every key a decision, a file name for exports and an exported target for reuses", () => {
			const all = rows();
			const exported = all
				.filter((row) => row.Decision === "export")
				.map((row) => code(row.Key));
			expect(exported.length).toBeGreaterThan(30);
			for (const row of all) {
				const key = code(row.Key);
				const decision = row.Decision ?? "";
				expect(["export", "reuse", "core"], key).toContain(decision);
				if (decision === "export") {
					expect(code(row.File), key).toBe(`${kebab(key)}.png`);
					expect(row.Source, key).toMatch(/\S/);
				} else {
					expect(row.File, key).toBe("—");
				}
				if (decision === "reuse") {
					expect(exported, key).toContain(code(row.Source));
				}
			}
		});
	});

	describe("system art", () => {
		const keys = unionMembers(registrySource, "ClassicySystemArtKey");
		const rows = () => tableRows(section(doc, "System art"), "Key");

		it("lists every ClassicySystemArtKey, once, and nothing else", () => {
			const listed = keysOf(rows(), "Key");
			expect(keys.length).toBeGreaterThan(30);
			expect(duplicates(listed)).toEqual([]);
			expect(keys.filter((key) => !listed.includes(key))).toEqual([]);
			expect(listed.filter((key) => !keys.includes(key))).toEqual([]);
		});

		it("marks each key export, crop, draw, core or reuse, naming its files", () => {
			const all = rows();
			const listed = keysOf(all, "Key");
			for (const row of all) {
				const key = code(row.Key);
				const decision = row.Decision ?? "";
				expect(["export", "crop", "draw", "core", "reuse"], key).toContain(
					decision,
				);
				if (decision === "export" || decision === "crop") {
					expect(code(row["Color file"]), key).toBe(
						`art/color/${kebab(key)}.png`,
					);
					expect(row["B&W file"], key).toMatch(
						new RegExp(`^(\`art/bw/${kebab(key)}\\.png\`|same as color)$`),
					);
				}
				if (decision === "reuse") {
					expect(listed, key).toContain(code(row.Source));
				}
			}
		});
	});

	describe("cursors", () => {
		const roles = unionMembers(registrySource, "ClassicyCursorRole");
		const rows = () => tableRows(section(doc, "Cursors"), "Role");

		it("lists every ClassicyCursorRole, once, and nothing else", () => {
			const listed = keysOf(rows(), "Role");
			expect(roles.length).toBeGreaterThan(10);
			expect(duplicates(listed)).toEqual([]);
			expect(roles.filter((role) => !listed.includes(role))).toEqual([]);
			expect(listed.filter((role) => !roles.includes(role))).toEqual([]);
		});

		it("gives every role a decision, a file and a hotspot", () => {
			for (const row of rows()) {
				const role = code(row.Role);
				expect(["export", "draw", "core"], role).toContain(row.Decision ?? "");
				if (row.Decision !== "core") {
					expect(code(row.File), role).toBe(`cursors/${kebab(role)}.png`);
				}
				expect(row["Hotspot (x, y)"], role).toMatch(/\S/);
			}
		});
	});

	describe("sounds", () => {
		it("lists the six System 7.5 alert sounds with Simple Beep as the default", () => {
			const rows = tableRows(section(doc, "Sounds"), "Sprite id");
			const ids = keysOf(rows, "Sprite id");
			for (const id of [
				"ClassicyAlertSimpleBeep",
				"ClassicyAlertDroplet",
				"ClassicyAlertIndigo",
				"ClassicyAlertQuack",
				"ClassicyAlertSosumi",
				"ClassicyAlertWildEep",
			])
				expect(ids).toContain(id);
			const defaults = rows.filter((row) => /default/i.test(row.Notes ?? ""));
			expect(defaults.map((row) => code(row["Sprite id"]))).toEqual([
				"ClassicyAlertSimpleBeep",
			]);
		});
	});

	describe("window colors", () => {
		it("lists the wctb and cctb parts", () => {
			const text = section(doc, "Window colors");
			expect(text).toContain("`wctb`");
			expect(text).toContain("`cctb`");
			expect(tableRows(text, "Part").length).toBeGreaterThan(20);
		});
	});
});
