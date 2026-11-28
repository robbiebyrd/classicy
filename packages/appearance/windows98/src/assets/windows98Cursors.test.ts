import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, renderHook } from "@testing-library/react";
import { PNG } from "pngjs";
import { afterEach, describe, expect, it } from "vitest";
// Platinum first, as a host loads it: the default package beside Windows 98.
import "../../../platinum/src/index";
import "../index";
import {
	type ClassicyCursorRole,
	resolveClassicyAsset,
	resolveClassicyCursorHotspot,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import { dispatch } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { WINDOWS98_CURSOR_ADDITIONS } from "./windows98AssetAdditions";
import { WINDOWS98_CURSORS as WINDOWS98_FIRST_CURSORS } from "./windows98Assets";

/** Escapes every regular-expression metacharacter in `text`. */
const escapeRegExp = (text: string): string =>
	text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Every role's cursor: lane 3's registration and the roles added beside it
// (windows98AssetAdditions.ts).
const WINDOWS98_CURSORS = {
	...WINDOWS98_FIRST_CURSORS,
	...WINDOWS98_CURSOR_ADDITIONS,
};

// Windows 98's cursors (docs/windows98-asset-inventory.md, "Cursors"):
// USER.EXE's system cursors, read from the Windows 98 SE CD, one per
// `ClassicyCursorRole`, each at the hotspot its resource declares, drawn
// while Windows 98 is active; Platinum keeps its own.

const WINDOWS98 = "windows98";
const PLATINUM = "platinum";
const CURSORS = path.join(import.meta.dirname, "cursors");
const repoRoot = path.resolve(import.meta.dirname, "../../../../..");
const ROLES = [
	...(
		/export type ClassicyCursorRole =([^;]+);/.exec(
			readFileSync(
				path.join(repoRoot, "src/Appearance/ClassicyAssetRegistry.ts"),
				"utf8",
			),
		)?.[1] ?? ""
	).matchAll(/"([^"]+)"/g),
].map((m) => m[1]) as ClassicyCursorRole[];

/** A cursor file's stem (`user-cursor-105`) from its registered URL. */
const stemOf = (src: string): string =>
	/\/cursors\/([^/]+)\.png$/.exec(src)?.[1] ?? src;

/** A PNG's chunk types, in order. */
const pngChunks = (bytes: Buffer): string[] => {
	const types: string[] = [];
	for (let at = 8; at + 8 <= bytes.length; ) {
		const length = bytes.readUInt32BE(at);
		types.push(bytes.toString("latin1", at + 4, at + 8));
		at += 12 + length;
	}
	return types;
};

const files = readdirSync(CURSORS).sort();
const image = (file: string) =>
	PNG.sync.read(readFileSync(path.join(CURSORS, file)));

/** Switches the active package, as the Appearance Manager does. */
const switchPackage = (packageId: string) =>
	act(() => {
		dispatch({ type: "ClassicyDesktopChangeAppearancePackage", packageId });
	});

afterEach(() => switchPackage(PLATINUM));

describe("Windows 98's cursors", () => {
	describe("files", () => {
		it("are the twelve USER.EXE cursors the roles draw", () =>
			expect(files).toEqual(
				[100, 101, 102, 103, 105, 106, 107, 108, 110, 111, 112, 114].map(
					(id) => `user-cursor-${id}.png`,
				),
			));

		// The format every browser takes for a CSS cursor, with no chunk that
		// would tell a browser to correct the colors.
		it("are 32 x 32 PNGs with no ancillary chunk", () => {
			for (const file of files) {
				const bytes = readFileSync(path.join(CURSORS, file));
				expect(pngChunks(bytes), file).toEqual(["IHDR", "IDAT", "IEND"]);
				const { width, height } = image(file);
				expect([width, height], file).toEqual([32, 32]);
			}
		});

		// 1-bit cursors: black, white or clear, each pixel (the pixels that
		// inverted the screen drawn black).
		it("hold only opaque black, opaque white and clear pixels", () => {
			for (const file of files) {
				const { data } = image(file);
				for (let at = 0; at < data.length; at += 4) {
					const pixel = [...data.subarray(at, at + 4)].join(",");
					expect(["0,0,0,255", "255,255,255,255", "0,0,0,0"], file).toContain(
						pixel,
					);
				}
			}
		});

		// The package README's "Asset sources" names each file's resource.
		it("are each credited in the package README with its resource", () => {
			const readme = readFileSync(
				path.resolve(import.meta.dirname, "../../README.md"),
				"utf8",
			);
			for (const file of files) {
				const id = /^user-cursor-(\d+)\.png$/.exec(file)?.[1];
				expect(readme, file).toMatch(
					new RegExp(
						`\\| \`${escapeRegExp(file)}\` \\| \`user\\.exe\` cursor ${id} \\|`,
					),
				);
			}
		});

		it("ships every cursor a role names, and no other", () =>
			expect(
				[
					...new Set(
						Object.values(WINDOWS98_CURSORS).map(
							({ src }) => `${stemOf(src)}.png`,
						),
					),
				].sort(),
			).toEqual(files));
	});

	describe("registration", () => {
		it("names every role", () =>
			expect(Object.keys(WINDOWS98_CURSORS).sort()).toEqual([...ROLES].sort()));

		it.each([
			["arrow", "user-cursor-100", [0, 0]],
			["watch", "user-cursor-102", [16, 16]],
			["hand", "user-cursor-114", [5, 0]],
			["ibeam", "user-cursor-101", [15, 16]],
			["crosshair", "user-cursor-103", [15, 16]],
			["resizeLr", "user-cursor-107", [16, 16]],
			["resizeUd", "user-cursor-108", [15, 16]],
			["resizeNwse", "user-cursor-105", [16, 16]],
			["resizeNesw", "user-cursor-106", [16, 16]],
			// Windows had no one-way size cursor: the two-way one stands in.
			["resizeU", "user-cursor-108", [15, 16]],
			["resizeD", "user-cursor-108", [15, 16]],
			["resizeL", "user-cursor-107", [16, 16]],
			["resizeR", "user-cursor-107", [16, 16]],
			// Help Select, the arrow with a question mark: What's This?'s pointer.
			["help", "user-cursor-112", [5, 7]],
			// Unavailable, the slashed circle: a refused drop.
			["notAllowed", "user-cursor-110", [15, 15]],
			// Working in Background, the arrow with a small hourglass.
			["appStarting", "user-cursor-111", [0, 0]],
		] as const)("draws %s as %s at its hotspot %j", (role, stem, hotspot) => {
			const src = resolveClassicyAsset("cursors", role, WINDOWS98) ?? "";
			expect(stemOf(src)).toBe(stem);
			expect(src).toBe(WINDOWS98_CURSORS[role].src);
			expect(resolveClassicyCursorHotspot(role, WINDOWS98)).toEqual(hotspot);
		});

		// A hotspot is the pixel that points: one the cursor draws.
		it("points each hotspot at a pixel of its cursor", () => {
			for (const [role, { src, hotspot }] of Object.entries(
				WINDOWS98_CURSORS,
			)) {
				const { data, width } = image(`${stemOf(src)}.png`);
				expect(data[(hotspot[1] * width + hotspot[0]) * 4 + 3], role).toBe(255);
			}
		});

		it("leaves Platinum's cursors alone", () => {
			for (const role of ROLES)
				expect(resolveClassicyAsset("cursors", role, PLATINUM), role).not.toBe(
					WINDOWS98_CURSORS[role].src,
				);
		});
	});

	// The desktop root publishes the active package's cursors to the
	// stylesheets (`useClassicyAssetVars`, ClassicyDesktop).
	it("are published as the desktop's cursor variables while Windows 98 is active", () => {
		switchPackage(WINDOWS98);
		const { result } = renderHook(() => useClassicyAssetVars());
		expect(result.current["--classicy-cursor-resize-nwse"]).toBe(
			`url("${WINDOWS98_CURSORS.resizeNwse.src}")`,
		);
		expect(result.current["--classicy-cursor-resize-nwse-hotspot"]).toBe(
			"16 16",
		);
		expect(result.current["--classicy-cursor-hand-hotspot"]).toBe("5 0");
		switchPackage(PLATINUM);
		expect(result.current["--classicy-cursor-resize-nwse"]).not.toBe(
			`url("${WINDOWS98_CURSORS.resizeNwse.src}")`,
		);
	});
});
