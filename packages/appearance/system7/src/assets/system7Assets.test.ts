import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { describe, expect, it } from "vitest";
import {
	type ClassicyAssetTree,
	type ClassicyCursorRole,
	type ClassicySystemArtKey,
	resolveClassicyAsset,
	resolveClassicyCursorHotspot,
	resolveClassicyIcon,
} from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import "../index";
import system7Json from "../system7.json";
import { SYSTEM7_BW_VARIANT } from "./system7Assets";
import { SYSTEM7_ICON_FILES, SYSTEM7_ICON_REUSE } from "./system7Icons";

// System 7's icons, system art and cursors (plan 0018-dbd §4.1), registered
// alone (the test setup registers no other package): a host that loads only
// System 7 finds every system-art key and cursor role, every icon the
// inventory exports or reuses draws System 7's file in both themes, and
// every other icon is the core's.

const SYSTEM7 = "system7";
const BW = SYSTEM7_BW_VARIANT;
// A lookup with no variant reads the active theme's, so the base tree is read
// with a variant System 7 never registers ("color" is the base tree's).
const BASE = "color";
const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
const assets = import.meta.dirname;
const registrySource = readFileSync(
	path.join(repoRoot, "src/Appearance/ClassicyAssetRegistry.ts"),
	"utf8",
);

const unionMembers = (typeName: string): string[] => {
	const match = new RegExp(`export type ${typeName} =([^;]+);`).exec(
		registrySource,
	);
	return [...(match?.[1] ?? "").matchAll(/"([^"]+)"/g)].map((m) => m[1] ?? "");
};

const iconLeaves = (tree: ClassicyAssetTree, trail = ""): string[] =>
	Object.entries(tree).flatMap(([key, value]) => {
		const keyPath = trail ? `${trail}.${key}` : key;
		return typeof value === "string" ? [keyPath] : iconLeaves(value, keyPath);
	});

const coreIcon = (key: string): string =>
	key
		.split(".")
		.reduce<unknown>(
			(node, segment) => (node as Record<string, unknown>)[segment],
			ClassicyIcons,
		) as string;

const ART_KEYS = unionMembers("ClassicySystemArtKey") as ClassicySystemArtKey[];
const CURSOR_ROLES = unionMembers("ClassicyCursorRole") as ClassicyCursorRole[];
const ICON_KEYS = iconLeaves(ClassicyIcons);

/** A PNG's chunk types, and its RGBA pixels when it is 8-bit RGBA, unfiltered (the export's own writer). */
const png = (file: string) => {
	const bytes = readFileSync(file);
	const types: string[] = [];
	const idat: Buffer[] = [];
	let width = 0;
	let height = 0;
	let rgba = false;
	for (let at = 8; at < bytes.length; ) {
		const length = bytes.readUInt32BE(at);
		const type = bytes.toString("latin1", at + 4, at + 8);
		const data = bytes.subarray(at + 8, at + 8 + length);
		types.push(type);
		if (type === "IHDR") {
			width = data.readUInt32BE(0);
			height = data.readUInt32BE(4);
			rgba = data[8] === 8 && data[9] === 6;
		}
		if (type === "IDAT") idat.push(data);
		at += 12 + length;
	}
	const pixels: number[][] = [];
	if (rgba) {
		const raw = inflateSync(Buffer.concat(idat));
		for (let y = 0; y < height; y++) {
			if (raw[y * (width * 4 + 1)] !== 0) return { types, pixels: undefined };
			for (let x = 0; x < width; x++) {
				const at = y * (width * 4 + 1) + 1 + x * 4;
				pixels.push([...raw.subarray(at, at + 4)]);
			}
		}
	}
	return { types, pixels: rgba ? pixels : undefined };
};

const pngsUnder = (dir: string): string[] =>
	(readdirSync(path.join(assets, dir), { recursive: true }) as string[])
		.filter((file) => file.endsWith(".png"))
		.map((file) => path.join(assets, dir, file));

describe("System 7's assets", () => {
	it("draws the bw variant in the 1-bit theme and the base tree in color", () => {
		const variants = system7Json.presets.map((theme) => [
			theme.id,
			"assetVariant" in theme ? theme.assetVariant : undefined,
		]);
		expect(variants).toEqual([
			["system7", BW],
			["system7-color", undefined],
		]);
	});

	// docs/system7-asset-inventory.md, "PNG rules".
	describe("files", () => {
		const all = [
			...pngsUnder("icons"),
			...pngsUnder("art"),
			...pngsUnder("cursors"),
		];

		it("carry no color profile or metadata: only the chunks that hold pixels", () => {
			expect(all.length).toBeGreaterThan(250);
			for (const file of all)
				expect(
					png(file).types.filter(
						(type) => !["IHDR", "PLTE", "tRNS", "IDAT", "IEND"].includes(type),
					),
					file,
				).toEqual([]);
		});

		it("keep 1-bit files and cursors to opaque black, opaque white and clear", () => {
			const oneBit = [
				...pngsUnder("icons/bw"),
				...pngsUnder("art/bw"),
				...pngsUnder("cursors"),
			];
			let checked = 0;
			for (const file of oneBit) {
				// Every 1-bit file is the export's own RGBA, so none goes unchecked.
				const { pixels } = png(file);
				expect(pixels, `${file} is 8-bit RGBA, unfiltered`).toBeDefined();
				checked++;
				for (const [r, g, b, a] of pixels ?? []) {
					const ok =
						(a === 0 && r === 0 && g === 0 && b === 0) ||
						(a === 255 && r === g && g === b && (r === 0 || r === 255));
					if (!ok) expect([r, g, b, a], file).toBe("black, white or clear");
				}
			}
			expect(checked).toBe(oneBit.length);
			expect(checked).toBeGreaterThan(100);
		});

		it("never hold partial alpha", () => {
			for (const file of all)
				for (const [, , , a] of png(file).pixels ?? [])
					if (a !== 0 && a !== 255) expect(a, file).toBe("0 or 255");
		});
	});

	describe("system art", () => {
		it("registers every ClassicySystemArtKey", () => {
			expect(ART_KEYS.length).toBeGreaterThan(40);
			for (const variant of [BASE, BW])
				expect(
					ART_KEYS.filter(
						(key) => !resolveClassicyAsset("systemArt", key, SYSTEM7, variant),
					),
					String(variant),
				).toEqual([]);
		});

		it("gives the 1-bit theme its own file where the look differs", () => {
			const differs = ART_KEYS.filter(
				(key) =>
					resolveClassicyAsset("systemArt", key, SYSTEM7, BW) !==
					resolveClassicyAsset("systemArt", key, SYSTEM7, BASE),
			);
			expect(differs.sort()).toEqual(
				[
					"appleMenu",
					"helpButton",
					"helpMenuTitle",
					"startupLogo",
					"trashEmpty",
					"trashFull",
					"windowGrip",
					"windowStripes",
					"windowStripesRed",
					"windowUtilityTexture",
					"zoomGlyph",
				].sort(),
			);
			for (const key of differs) {
				expect(resolveClassicyAsset("systemArt", key, SYSTEM7, BW)).toMatch(
					/\/art\/bw\//,
				);
				expect(resolveClassicyAsset("systemArt", key, SYSTEM7, BASE)).toMatch(
					/\/art\/color\//,
				);
			}
		});

		// verify-dist holds the build to it: the dither checker is the one
		// file the bundles inline (a mask, fetched in CORS mode as a URL).
		it("registers the dither checker inline, a currentColor checker", () => {
			const checker = resolveClassicyAsset(
				"systemArt",
				"ditherChecker",
				SYSTEM7,
			);
			expect(checker).toMatch(/^data:image\/svg\+xml,/);
			expect(decodeURIComponent(checker ?? "")).toContain("currentColor");
		});

		it("takes the About logo, pre-boot halftone and QuickTime thumbs from the core", () => {
			expect(resolveClassicyAsset("systemArt", "aboutLogo", SYSTEM7)).toBe(
				ClassicyIcons.classicy.logo,
			);
			expect(resolveClassicyAsset("systemArt", "halftoneLarge", SYSTEM7)).toBe(
				ClassicyIcons.ui.halftoneLarge,
			);
			expect(
				resolveClassicyAsset("systemArt", "quickTimeThumbSlider", SYSTEM7),
			).toBe(ClassicyIcons.system.quicktime.thumbSlider);
		});
	});

	describe("cursors", () => {
		it("registers every ClassicyCursorRole", () => {
			expect(CURSOR_ROLES.length).toBeGreaterThan(10);
			expect(
				CURSOR_ROLES.filter(
					(role) => !resolveClassicyAsset("cursors", role, SYSTEM7),
				),
			).toEqual([]);
		});

		it("points each cursor at its CURS hotspot, the arrow at its tip", () => {
			const hotspots = Object.fromEntries(
				CURSOR_ROLES.map((role) => [
					role,
					resolveClassicyCursorHotspot(role, SYSTEM7),
				]),
			);
			expect(hotspots).toEqual({
				arrow: [1, 1],
				watch: [8, 8],
				// The core's hand, which the stylesheets point at 8 8.
				hand: undefined,
				ibeam: [7, 4],
				crosshair: [5, 5],
				resizeLr: [8, 8],
				resizeUd: [8, 8],
				resizeNwse: [8, 8],
				resizeNesw: [8, 8],
				resizeU: [8, 8],
				resizeD: [8, 8],
				resizeL: [8, 8],
				resizeR: [8, 8],
			});
		});
	});

	describe("icons", () => {
		const exported = Object.keys(SYSTEM7_ICON_FILES);
		const reused = Object.keys(SYSTEM7_ICON_REUSE);

		it("names only keys of the core icon tree, each once", () => {
			expect(
				[...exported, ...reused].filter((k) => !ICON_KEYS.includes(k)),
			).toEqual([]);
			expect(exported.filter((key) => reused.includes(key))).toEqual([]);
			for (const [key, target] of Object.entries(SYSTEM7_ICON_REUSE))
				expect(exported, key).toContain(target);
		});

		it("draws each exported key's own files: color in the base tree, 1-bit in bw", () => {
			for (const [key, stem] of Object.entries(SYSTEM7_ICON_FILES)) {
				const color = resolveClassicyIcon(key, SYSTEM7, BASE);
				const bw = resolveClassicyIcon(key, SYSTEM7, BW);
				expect(color?.src, key).toMatch(
					new RegExp(`/icons/color/(32|16)/${stem}\\.png$`),
				);
				expect(bw?.src, key).toMatch(
					new RegExp(`/icons/bw/(32|16)/${stem}\\.png$`),
				);
				// A family with a 16 px image draws it at the small size.
				const has16 = existsSync(
					path.join(assets, `icons/color/16/${stem}.png`),
				);
				expect(color?.small !== undefined, key).toBe(has16);
				if (has16) {
					expect(color?.small, key).toMatch(/\/icons\/color\/16\//);
					expect(bw?.small, key).toMatch(/\/icons\/bw\/16\//);
				}
			}
		});

		// System ICN# 3 is the generic compact Mac the System's BNDL gives
		// several types (the same image as -16482); the Finder's own icon is
		// Finder 3967.
		it("draws the Finder's own icon for system.macos, not the compact Mac", () => {
			for (const variant of [BASE, BW])
				for (const size of ["32", "16"]) {
					const dir = path.join(
						assets,
						"icons",
						variant === BW ? "bw" : "color",
						size,
					);
					expect(
						readFileSync(path.join(dir, "system-macos.png")).equals(
							readFileSync(path.join(dir, "system-mac.png")),
						),
						`${variant} ${size}`,
					).toBe(false);
				}
			expect(
				resolveClassicyAsset("icons", "system.macos", SYSTEM7, BASE),
			).not.toBe(resolveClassicyAsset("icons", "system.mac", SYSTEM7, BASE));
		});

		it("draws a reused key as the key it reuses, in both themes", () => {
			for (const [key, target] of Object.entries(SYSTEM7_ICON_REUSE))
				for (const variant of [BASE, BW])
					expect(resolveClassicyIcon(key, SYSTEM7, variant), key).toEqual(
						resolveClassicyIcon(target, SYSTEM7, variant),
					);
		});

		it("leaves every other key to the core's image", () => {
			const core = ICON_KEYS.filter(
				(key) => !exported.includes(key) && !reused.includes(key),
			);
			expect(core.length).toBeGreaterThan(100);
			for (const key of core)
				for (const variant of [BASE, BW])
					expect(
						resolveClassicyAsset("icons", key, SYSTEM7, variant),
						key,
					).toBe(coreIcon(key));
		});

		// docs/system7-asset-inventory.md is the map: each row's decision is
		// what System 7 registers for its key.
		it("registers each key as the inventory decides: export, reuse or core", () => {
			const doc = readFileSync(
				path.join(repoRoot, "docs/system7-asset-inventory.md"),
				"utf8",
			);
			const icons = doc.slice(
				doc.indexOf("\n## Icons\n"),
				doc.indexOf("\n## System art\n"),
			);
			const rows = icons
				.split("\n")
				.filter((line) => /^\| (\[[ x]\]|—) \| `/.test(line))
				.map((line) =>
					line
						.replace(/^\||\|$/g, "")
						.split("|")
						.map((cell) => cell.trim()),
				);
			const code = (cell = "") => /`([^`]+)`/.exec(cell)?.[1] ?? "";
			expect(rows.length).toBe(ICON_KEYS.length);
			for (const [done, keyCell, , decision, source, , file] of rows) {
				const key = code(keyCell);
				if (decision === "export") {
					expect(done, key).toBe("[x]");
					expect(`${SYSTEM7_ICON_FILES[key]}.png`, key).toBe(code(file));
				} else if (decision === "reuse") {
					expect(SYSTEM7_ICON_REUSE[key], key).toBe(code(source));
				} else {
					expect(decision, key).toBe("core");
					expect(SYSTEM7_ICON_FILES[key] ?? SYSTEM7_ICON_REUSE[key], key).toBe(
						undefined,
					);
				}
			}
		});

		it("ships every icon file a key names, and no other", () => {
			const onDisk = ["color", "bw"].flatMap((variant) =>
				["32", "16"].flatMap((size) =>
					readdirSync(path.join(assets, "icons", variant, size)).map(
						(file) => `${variant}/${size}/${file}`,
					),
				),
			);
			const stems = new Set(Object.values(SYSTEM7_ICON_FILES));
			expect(
				onDisk.filter((file) => !stems.has(path.basename(file, ".png"))),
			).toEqual([]);
			// Every family has the same files in both variants.
			for (const size of ["32", "16"])
				expect(
					readdirSync(path.join(assets, "icons", "bw", size)).sort(),
					size,
				).toEqual(
					readdirSync(path.join(assets, "icons", "color", size)).sort(),
				);
			for (const stem of stems)
				expect(
					onDisk.some((file) => file.endsWith(`/${stem}.png`)),
					stem,
				).toBe(true);
		});
	});
});
