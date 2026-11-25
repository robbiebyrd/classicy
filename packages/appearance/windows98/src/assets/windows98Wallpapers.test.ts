import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, describe, expect, it } from "vitest";
// Platinum first, as a host loads it: the default package beside Windows 98.
import "../../../platinum/src/index";
import "../index";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	listClassicyWallpapers,
	portableClassicyWallpaper,
	resolveClassicyWallpaper,
} from "@/Appearance/ClassicyWallpaperIndex";
import { getThemeVars } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { classicyDesktopEventHandler } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopManager";
import { decodeClassicyWebp } from "../../../../../bin/classicyWebp";
import {
	WINDOWS98_DESKTOP_PATTERNS,
	WINDOWS98_WALLPAPERS,
	windows98WallpaperFile,
} from "./windows98Wallpapers";

/** Escapes every regular-expression metacharacter in `text`. */
const escapeRegExp = (text: string): string =>
	text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Windows 98's wallpapers and desktop patterns (windows98Wallpapers.ts,
// docs/windows98-asset-inventory.md): each a lossless WebP in ./wallpapers,
// registered under Windows 98 by its identity filename, offered by the
// Desktop tab while Windows 98 is active, and stored by that filename.

const WALLPAPER_DIR = path.join(import.meta.dirname, "wallpapers");
const ALL = [...WINDOWS98_WALLPAPERS, ...WINDOWS98_DESKTOP_PATTERNS];

const setPackage = (packageId: string) =>
	act(() =>
		useAppManager.setState((state) =>
			produce(state, (draft) => {
				draft.System.Manager.Appearance.packageId = packageId;
			}),
		),
	);

afterEach(() => setPackage("platinum"));

/** A WebP's RIFF chunk types (after the `WEBP` form type). */
const webpChunks = (bytes: Buffer): string[] => {
	const chunks: string[] = [];
	for (let at = 12; at + 8 <= bytes.length; ) {
		chunks.push(bytes.toString("latin1", at, at + 4));
		at += 8 + bytes.readUInt32LE(at + 4) + (bytes.readUInt32LE(at + 4) % 2);
	}
	return chunks;
};

describe("Windows 98's wallpapers and desktop patterns", () => {
	describe("files", () => {
		it("are exactly the listed ones, WebP, one lossless chunk each", () => {
			expect(readdirSync(WALLPAPER_DIR).sort()).toEqual(
				ALL.map(({ file }) => windows98WallpaperFile(file)).sort(),
			);
			for (const { file } of ALL)
				expect(
					webpChunks(
						readFileSync(
							path.join(WALLPAPER_DIR, windows98WallpaperFile(file)),
						),
					),
					file,
				).toEqual(["VP8L"]);
		});

		it("keep each bitmap's size, every pixel opaque", async () => {
			for (const { file, width, height } of WINDOWS98_WALLPAPERS) {
				const image = await decodeClassicyWebp(
					new Uint8Array(
						readFileSync(
							path.join(WALLPAPER_DIR, windows98WallpaperFile(file)),
						),
					),
				);
				expect([image.width, image.height], file).toEqual([width, height]);
				let clear = -1;
				for (let i = 3; i < image.data.length && clear < 0; i += 4)
					if (image.data[i] !== 255) clear = (i - 3) / 4;
				expect(clear, `${file}: the first pixel not opaque`).toBe(-1);
			}
		}, 30_000);

		// shell.inf's bytes, a 1 bit opaque black and a 0 bit clear, so the
		// desktop's color shows between.
		it("draw each pattern's eight bytes, black on clear", async () => {
			for (const { file, rows } of WINDOWS98_DESKTOP_PATTERNS) {
				const image = await decodeClassicyWebp(
					new Uint8Array(
						readFileSync(
							path.join(WALLPAPER_DIR, windows98WallpaperFile(file)),
						),
					),
				);
				expect([image.width, image.height], file).toEqual([8, 8]);
				expect(rows, file).toHaveLength(8);
				rows.forEach((byte, y) => {
					for (let x = 0; x < 8; x++) {
						const at = (y * 8 + x) * 4;
						const pixel = [...image.data.subarray(at, at + 4)];
						expect(pixel, `${file} ${x},${y}`).toEqual(
							byte & (0x80 >> x) ? [0, 0, 0, 255] : [0, 0, 0, 0],
						);
					}
				});
			}
		}, 30_000);
	});

	describe("lists", () => {
		it("hold Windows 98 SE's nineteen wallpapers and nineteen patterns", () => {
			expect(WINDOWS98_WALLPAPERS).toHaveLength(19);
			expect(WINDOWS98_DESKTOP_PATTERNS).toHaveLength(19);
		});

		it("label each once, in the Display control panel's order, and name each file once", () => {
			const labels = ALL.map(({ label }) => label);
			expect(new Set(labels).size).toBe(labels.length);
			for (const list of [WINDOWS98_WALLPAPERS, WINDOWS98_DESKTOP_PATTERNS])
				expect(list.map(({ label }) => label)).toEqual(
					list.map(({ label }) => label).sort((a, b) => a.localeCompare(b)),
				);
			const files = ALL.map(({ file }) => file);
			expect(new Set(files).size).toBe(files.length);
			// Each a plain filename a theme may hold: no space, slash, colon or
			// package separator.
			for (const file of files)
				expect(file).toMatch(/^[a-z0-9-]+\.(?:bmp|png)$/);
		});

		it("label every pattern as one, apart from the wallpaper of its name", () => {
			for (const { label } of WINDOWS98_DESKTOP_PATTERNS)
				expect(label).toMatch(/ Pattern$/);
			expect(ALL.map(({ label }) => label)).toEqual(
				expect.arrayContaining(["Triangles", "Triangles Pattern"]),
			);
		});
	});

	describe("registration", () => {
		it("registers each under Windows 98 by its filename", () => {
			for (const { label, file } of ALL) {
				const src = resolveClassicyWallpaper(file, "windows98");
				expect(src, file).toMatch(
					new RegExp(`${escapeRegExp(windows98WallpaperFile(file))}$`),
				);
				expect(
					listClassicyWallpapers("windows98").find((w) => w.name === label),
					label,
				).toEqual({ name: label, file, src });
			}
		});

		it("offers them while Windows 98 is active, after Platinum's, and not under Platinum", () => {
			const names = (packageId: string) =>
				listClassicyWallpapers(packageId).map(({ name }) => name);
			const platinum = names("platinum");
			for (const { label } of ALL) expect(platinum).not.toContain(label);
			expect(names("windows98")).toEqual([
				...platinum,
				...ALL.map(({ label }) => label),
			]);
		});

		it("stores a pick by its filename, bare in a Windows 98 theme", () => {
			for (const { file } of ALL)
				expect(
					portableClassicyWallpaper(
						resolveClassicyWallpaper(file, "windows98"),
						"windows98",
					),
				).toBe(file);
		});

		// No preset names one: Windows Standard keeps its plain teal desktop,
		// every scheme its own Background.
		it("leaves every preset's desktop its plain color", () => {
			const pkg = getClassicyAppearancePackage("windows98");
			for (const theme of [pkg?.defaults, ...(pkg?.presets ?? [])]) {
				expect(theme?.desktop.backgroundImage, theme?.id).toBe("");
				expect(
					getThemeVars(theme as NonNullable<typeof theme>)[
						"--desktop-background-image"
					],
					theme?.id,
				).toBe("none");
			}
			expect(pkg?.defaults.desktop.backgroundColor).toBe(0x008080);
		});

		it("draws a pattern picked on Windows Standard over its teal, from the screen's corner, repeated", () => {
			setPackage("windows98");
			const pkg = getClassicyAppearancePackage("windows98");
			const state = structuredClone(useAppManager.getState());
			state.System.Manager.Appearance.activeTheme = structuredClone(
				pkg?.defaults as NonNullable<typeof pkg>["defaults"],
			);
			const after = classicyDesktopEventHandler(state, {
				type: "ClassicyDesktopChangeBackground",
				backgroundImage: resolveClassicyWallpaper(
					"pattern-bricks.png",
					"windows98",
				),
			});
			const theme = after.System.Manager.Appearance.activeTheme;
			expect(theme.desktop.backgroundImage).toBe("pattern-bricks.png");
			const vars = getThemeVars(theme);
			expect(vars["--desktop-background-image"]).toBe(
				`url("${resolveClassicyWallpaper("pattern-bricks.png", "windows98")}")`,
			);
			expect(vars["--desktop-background-color"]).toBe("#008080");
			expect(vars["--desktop-background-repeat"]).toBe("repeat");
		});
	});
});
