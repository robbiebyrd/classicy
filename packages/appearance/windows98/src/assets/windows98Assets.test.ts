import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
// Platinum first, as a host loads it: the default package beside Windows 98.
import "../../../platinum/src/index";
import "../index";
import {
	type ClassicyAssetTree,
	type ClassicySystemArtKey,
	resolveClassicyAsset,
	resolveClassicyIcon,
	resolveClassicyIconImage,
} from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { decodeClassicyWebp } from "../../../../../bin/classicyWebp";
import { WINDOWS98_FILE_TYPE_ICON_FILES } from "./windows98AssetAdditions";
import { WINDOWS98_SYSTEM_ART, windows98IconFile } from "./windows98Assets";
import {
	WINDOWS98_ICON_FILES,
	WINDOWS98_ICON_REUSE,
	WINDOWS98_OWN_ICON_FILES,
} from "./windows98Icons";

// Windows 98's icons and system art (docs/windows98-asset-inventory.md),
// registered beside Platinum, the default package: every key the inventory
// exports or reuses draws Windows 98's file while Windows 98 is active, a
// core icon URL stored for one of those keys draws it too, and every other
// key, and everything under Platinum, is the core's.

const WINDOWS98 = "windows98";
const PLATINUM = "platinum";
const assets = import.meta.dirname;
const repoRoot = path.resolve(assets, "../../../../..");
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

const ICON_KEYS = iconLeaves(ClassicyIcons);
const ART_KEYS = unionMembers("ClassicySystemArtKey") as ClassicySystemArtKey[];

const filesIn = (dir: string, extension: string): string[] =>
	readdirSync(path.join(assets, dir))
		.filter((file) => file.endsWith(extension))
		.map((file) => path.join(assets, dir, file));
const webps = [...filesIn("icons", ".webp"), ...filesIn("art", ".webp")];

/** A WebP's RIFF chunk types (after the `WEBP` form type). */
const webpChunks = (file: string): string[] => {
	const bytes = readFileSync(file);
	expect(bytes.toString("latin1", 0, 4), file).toBe("RIFF");
	expect(bytes.toString("latin1", 8, 12), file).toBe("WEBP");
	const types: string[] = [];
	for (let at = 12; at + 8 <= bytes.length; ) {
		const length = bytes.readUInt32LE(at + 4);
		types.push(bytes.toString("latin1", at, at + 4));
		at += 8 + length + (length & 1);
	}
	return types;
};

/** The size a file's name gives it: an icon group's image, a toolbar cell, a picture. */
const sizeOf = (file: string): [number, number] => {
	const name = path.basename(file, ".webp");
	if (name === "wvlogo") return [480, 480];
	if (name === "explorer-bitmap-143") return [16, 16];
	if (name === "explorer-bitmap-157") return [21, 233];
	if (name === "shell32-bitmap-130") return [64, 64];
	if (name.startsWith("browseui-bitmap-")) return [20, 20];
	const size = Number(/-(\d+)$/.exec(name)?.[1]);
	return [size, size];
};

/** Switches the active package, as the Appearance Manager does. */
const switchPackage = (packageId: string) =>
	act(() => {
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });
	});

afterEach(() => switchPackage(PLATINUM));

describe("Windows 98's assets", () => {
	describe("files", () => {
		it("are WebP: no PNG, JPG, BMP, GIF or ICO is left in icons/ or art/", () => {
			// Lane 3's 148, the four document icons by type
			// (windows98AssetAdditions.ts: kodakimg #129 and quartz #200) and
			// the Start menu banner (Explorer's bitmap 157).
			expect(webps.length).toBe(153);
			for (const dir of ["icons", "art"])
				expect(
					readdirSync(path.join(assets, dir)).filter((file) =>
						/\.(png|jpe?g|bmp|gif|ico)$/i.test(file),
					),
					dir,
				).toEqual([]);
		});

		it("carry no color profile or metadata: a WebP is one lossless VP8L chunk", () => {
			for (const file of webps)
				expect(webpChunks(file), file).toEqual(["VP8L"]);
		});

		it("are the resources' own sizes, with no partial alpha", async () => {
			for (const file of webps) {
				const { width, height, data } = await decodeClassicyWebp(
					new Uint8Array(readFileSync(file)),
				);
				expect([width, height], file).toEqual(sizeOf(file));
				for (let at = 3; at < data.length; at += 4)
					if (data[at] !== 0 && data[at] !== 255)
						expect(data[at], file).toBe("0 or 255");
			}
		});

		// The Start flag and the Windows logo's `#C0C0C0` ground is clear (the
		// button face shows through, as Windows' LR_LOADMAP3DCOLORS drew it),
		// and no `#C0C0C0` pixel is left in them.
		it("clears the bitmaps' gray ground", async () => {
			for (const name of ["explorer-bitmap-143", "shell32-bitmap-130"]) {
				const { data } = await decodeClassicyWebp(
					new Uint8Array(
						readFileSync(path.join(assets, "art", `${name}.webp`)),
					),
				);
				expect(data[3], name).toBe(0);
				for (let at = 0; at < data.length; at += 4)
					if (data[at + 3] === 255)
						expect([data[at], data[at + 1], data[at + 2]], name).not.toEqual([
							192, 192, 192,
						]);
			}
		});

		// The Start menu banner keeps every pixel of Explorer's bitmap 157
		// (Explorer drew it as loaded, under every scheme): opaque, its top
		// row navy, the row Explorer stretched over the space above it.
		it("keeps every pixel of the Start menu banner, its top row navy", async () => {
			const { width, data } = await decodeClassicyWebp(
				new Uint8Array(
					readFileSync(path.join(assets, "art", "explorer-bitmap-157.webp")),
				),
			);
			for (let at = 3; at < data.length; at += 4) expect(data[at]).toBe(255);
			for (let x = 0; x < width; x++)
				expect([...data.slice(x * 4, x * 4 + 3)], `top row, x ${x}`).toEqual([
					0, 0, 128,
				]);
		});

		it("ships every icon a key, a leaf of its own, a file type or the system art names, and no other", () => {
			const named = new Set(
				[
					...Object.values(WINDOWS98_ICON_FILES),
					...Object.values(WINDOWS98_OWN_ICON_FILES),
					...Object.values(WINDOWS98_FILE_TYPE_ICON_FILES),
				].flatMap(({ src, small }) => (small ? [src, small] : [src])),
			);
			for (const source of Object.values(WINDOWS98_SYSTEM_ART)) {
				const match = /\/icons\/([^/]+)\.webp$/.exec(source ?? "");
				if (match?.[1]) named.add(match[1]);
			}
			const onDisk = filesIn("icons", ".webp").map((file) =>
				path.basename(file, ".webp"),
			);
			expect(onDisk.filter((stem) => !named.has(stem))).toEqual([]);
			expect([...named].filter((stem) => !onDisk.includes(stem))).toEqual([]);
		});
	});

	describe("icons", () => {
		const withFiles = Object.keys(WINDOWS98_ICON_FILES);
		const reused = Object.keys(WINDOWS98_ICON_REUSE);

		it("names only keys of the core icon tree, each once", () => {
			expect(
				[...withFiles, ...reused].filter((key) => !ICON_KEYS.includes(key)),
			).toEqual([]);
			expect(withFiles.filter((key) => reused.includes(key))).toEqual([]);
			for (const [key, target] of Object.entries(WINDOWS98_ICON_REUSE))
				expect(withFiles, key).toContain(target);
		});

		it("draws each key's own files: its image and its own 16 px one", () => {
			for (const [key, { src, small }] of Object.entries(
				WINDOWS98_ICON_FILES,
			)) {
				const leaf = resolveClassicyIcon(key, WINDOWS98);
				expect(leaf?.src, key).toBe(windows98IconFile(src));
				expect(leaf?.src, key).toMatch(new RegExp(`/icons/${src}\\.webp$`));
				expect(leaf?.small, key).toBe(
					small ? windows98IconFile(small) : undefined,
				);
			}
		});

		it("draws a reused key as the key it reuses", () => {
			for (const [key, target] of Object.entries(WINDOWS98_ICON_REUSE))
				expect(resolveClassicyIcon(key, WINDOWS98), key).toEqual(
					resolveClassicyIcon(target, WINDOWS98),
				);
		});

		it("leaves every other key to the core's image", () => {
			const core = ICON_KEYS.filter(
				(key) => !withFiles.includes(key) && !reused.includes(key),
			);
			expect(core.length).toBe(101);
			for (const key of core)
				expect(resolveClassicyAsset("icons", key, WINDOWS98), key).toBe(
					coreIcon(key),
				);
		});

		// Under the namespace no core key uses: the Finder's override icon and
		// the Recycle Bin, each drawn small through its own 16 px image.
		it("registers its own leaves with their 16 px images", () => {
			for (const [key, { src, small }] of Object.entries(
				WINDOWS98_OWN_ICON_FILES,
			)) {
				expect(key.startsWith("windows98."), key).toBe(true);
				expect(ICON_KEYS, key).not.toContain(key);
				expect(resolveClassicyIcon(key, WINDOWS98), key).toEqual({
					src: windows98IconFile(src),
					small: windows98IconFile(small ?? ""),
				});
			}
		});
	});

	// Icons travel as the core's URLs (stored file system entries, records,
	// props): each draws the active package's image for its key.
	describe("core icon URLs", () => {
		it("draw Windows 98's image while it is active, and the core's under Platinum", () => {
			const folder = ClassicyIcons.system.folders.directory;
			const disk = ClassicyIcons.system.drives.disk;
			const extension = ClassicyIcons.system.folders.extensions;
			switchPackage(WINDOWS98);
			expect(resolveClassicyIconImage(folder, 32)).toBe(
				windows98IconFile("shell32-4-32"),
			);
			expect(resolveClassicyIconImage(folder, 16)).toBe(
				windows98IconFile("shell32-4-16"),
			);
			expect(resolveClassicyIconImage(disk, 32)).toBe(
				windows98IconFile("shell32-9-32"),
			);
			// A reused key: a system folder is a plain folder.
			expect(resolveClassicyIconImage(extension, 32)).toBe(
				windows98IconFile("shell32-4-32"),
			);
			// A core key keeps the core's image.
			expect(resolveClassicyIconImage(ClassicyIcons.classicy.logo, 32)).toBe(
				ClassicyIcons.classicy.logo,
			);
			switchPackage(PLATINUM);
			for (const url of [folder, disk, extension])
				expect(resolveClassicyIconImage(url, 32)).toBe(url);
		});

		it("draw the package's own 16 px images small", () => {
			switchPackage(WINDOWS98);
			expect(
				resolveClassicyIconImage(windows98IconFile("shell32-32-32"), 16),
			).toBe(windows98IconFile("shell32-32-16"));
			expect(
				resolveClassicyIconImage(windows98IconFile("explorer-101-32"), 16),
			).toBe(windows98IconFile("explorer-101-16"));
		});

		// No two core keys sharing one URL are drawn differently, and no two
		// leaves sharing one image declare different small images: either
		// would log a warning and draw only one of them.
		it("follow without a collision", () => {
			const byUrl = new Map<string, Set<string | undefined>>();
			for (const key of ICON_KEYS) {
				const drawn = byUrl.get(coreIcon(key)) ?? new Set();
				drawn.add(resolveClassicyAsset("icons", key, WINDOWS98));
				byUrl.set(coreIcon(key), drawn);
			}
			expect(
				[...byUrl].filter(([, drawn]) => drawn.size > 1).map(([url]) => url),
			).toEqual([]);
			const smallOf = new Map<string, Set<string | undefined>>();
			for (const { src, small } of [
				...Object.values(WINDOWS98_ICON_FILES),
				...Object.values(WINDOWS98_OWN_ICON_FILES),
			]) {
				const smalls = smallOf.get(src) ?? new Set();
				smalls.add(small);
				smallOf.set(src, smalls);
			}
			expect(
				[...smallOf]
					.filter(([, smalls]) => smalls.size > 1)
					.map(([src]) => src),
			).toEqual([]);
		});

		it("log nothing while Windows 98 draws every core icon", () => {
			const entries: ClassicyLogEntry[] = [];
			registerClassicyLogSink({
				id: "windows98-assets-test",
				onLog: (entry) => entries.push(entry),
			});
			try {
				switchPackage(WINDOWS98);
				for (const key of ICON_KEYS) {
					resolveClassicyIconImage(coreIcon(key), 32);
					resolveClassicyIconImage(coreIcon(key), 16);
				}
				expect(entries.filter((entry) => entry.level !== "debug")).toEqual([]);
			} finally {
				unregisterClassicyLogSink("windows98-assets-test");
			}
		});
	});

	describe("system art", () => {
		it("registers the keys Windows drew from a bitmap or an icon", () => {
			expect(Object.keys(WINDOWS98_SYSTEM_ART).sort()).toEqual(
				[
					"aboutLogo",
					"aliasBadge",
					"appleMenu",
					"fileDialogFolderIcon",
					"openFolderIcon",
					"startMenuBanner",
					"startupLogo",
					"trashEmpty",
					"trashFull",
				].sort(),
			);
			for (const [key, source] of Object.entries(WINDOWS98_SYSTEM_ART))
				expect(resolveClassicyAsset("systemArt", key, WINDOWS98), key).toBe(
					source,
				);
		});

		it("draws the Recycle Bin, the shortcut overlay and the folders from their icon groups", () => {
			expect(WINDOWS98_SYSTEM_ART).toMatchObject({
				trashEmpty: windows98IconFile("shell32-32-32"),
				trashFull: windows98IconFile("shell32-33-32"),
				aliasBadge: windows98IconFile("shell32-30-32"),
				openFolderIcon: windows98IconFile("shell32-5-16"),
				fileDialogFolderIcon: windows98IconFile("shell32-4-16"),
			});
			expect(WINDOWS98_SYSTEM_ART.appleMenu).toMatch(
				/\/art\/explorer-bitmap-143\.webp$/,
			);
			expect(WINDOWS98_SYSTEM_ART.startupLogo).toMatch(
				/\/art\/shell32-bitmap-130\.webp$/,
			);
			expect(WINDOWS98_SYSTEM_ART.startMenuBanner).toMatch(
				/\/art\/explorer-bitmap-157\.webp$/,
			);
			expect(WINDOWS98_SYSTEM_ART.aboutLogo).toBe(
				WINDOWS98_SYSTEM_ART.startupLogo,
			);
		});

		// The rest resolve to the default package's (Platinum's) art, which
		// Windows 98's stylesheet hides or replaces where it would show.
		it("leaves every other key to the default package", () => {
			const others = ART_KEYS.filter((key) => !(key in WINDOWS98_SYSTEM_ART));
			expect(others.length).toBe(37);
			for (const key of others)
				expect(resolveClassicyAsset("systemArt", key, WINDOWS98), key).toBe(
					resolveClassicyAsset("systemArt", key, PLATINUM),
				);
		});

		it("leaves Platinum's own art alone", () => {
			for (const key of Object.keys(WINDOWS98_SYSTEM_ART))
				expect(resolveClassicyAsset("systemArt", key, PLATINUM), key).not.toBe(
					WINDOWS98_SYSTEM_ART[key as keyof typeof WINDOWS98_SYSTEM_ART],
				);
		});
	});

	// The store connects the active package: none of this reads `activeTheme`.
	it("switches with the stored package id", () => {
		switchPackage(WINDOWS98);
		expect(useAppManager.getState().System.Manager.Appearance.packageId).toBe(
			WINDOWS98,
		);
		expect(resolveClassicyAsset("systemArt", "trashEmpty")).toBe(
			windows98IconFile("shell32-32-32"),
		);
		switchPackage(PLATINUM);
		expect(resolveClassicyAsset("systemArt", "trashEmpty")).not.toBe(
			windows98IconFile("shell32-32-32"),
		);
	});
});
