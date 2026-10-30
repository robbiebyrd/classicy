import "@/Appearance/Platinum";
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { render, renderHook } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import {
	type ClassicySystemArtKey,
	classicyAssetVarName,
	resolveClassicyAsset,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import { isClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import {
	ClassicyPixelArt,
	decodeClassicyPixelArtRows,
} from "@/SystemFolder/SystemResources/PixelArt/ClassicyPixelArt";

const dir = path.join(process.cwd(), "src/Appearance/Platinum/assets/pixelart");

/** Each glyph's `[rows, columns]`: HIGOS8 Figures 6-15 and 2-16. */
const SIZES: Record<string, [number, number]> = {
	controlStripTab: [24, 17],
	controlStripCollapse: [8, 8],
	controlStripScrollLeft: [10, 8],
	controlStripScrollRight: [10, 8],
	controlStripScrollLeftDisabled: [10, 8],
	controlStripScrollRightDisabled: [10, 8],
	controlStripModuleArrow: [8, 4],
	popUpSliderTrack: [68, 10],
	popUpSliderThumb: [10, 15],
};
const KEYS = Object.keys(SIZES) as ClassicySystemArtKey[];

/**
 * SHA-256 of each glyph's rendered `<svg>` markup as drawn from the row
 * modules this task deleted (`ClassicyControlStripArt.ts`,
 * `ClassicyPopUpSliderArt.ts`) at 28c4e09a1. Same runs, same token classes,
 * same size: the strip and the pop-up slider draw exactly what they drew.
 */
const MARKUP_BEFORE: Record<string, string> = {
	controlStripTab:
		"4be11fcf733fd0fa3307a7f6f63f8ed1c33eb99393c15bb11e9aa063c04d3808",
	controlStripCollapse:
		"8b6a4b327bf895476dad8bac41c38ccc17428aa686ece0d2f3388346185f8b06",
	controlStripScrollLeft:
		"e90a8cb2dfa5d37abe5cc16ef32145015e7bb462d8da1f1b0fd92266439560ea",
	controlStripScrollRight:
		"56068ae14b52bcdc227f195a00ae704bb6f758d1814f0a1c64d801d3680d0243",
	controlStripScrollLeftDisabled:
		"2ecf0e4838af9a9748153ccf99454a4d5dbead8d2ed0e2ec08a95ad583a37d47",
	controlStripScrollRightDisabled:
		"4e3905a08d89903118d3b88d7f5a1c51130759a98ae577dabf4cfc264ba36d54",
	controlStripModuleArrow:
		"cfeed0787319b15588fd7d8ae4eb5a8c8d504fe073c2bb23411d1b64ffc4ad10",
	popUpSliderTrack:
		"e780935affea620ac33bfa80ac35cc5b3d34805f931b1cff27368dd9446ca990",
	popUpSliderThumb:
		"ab33b087f9b652b407d4d006b4e8153002be31f891a95f21b304e25dc51d1869",
};

describe("Platinum pixel art", () => {
	it("registers the nine Platinum glyphs at their HIG sizes", () => {
		for (const key of KEYS) {
			const rows = decodeClassicyPixelArtRows(
				resolveClassicyAsset("systemArt", key, "platinum"),
			);
			expect([rows.length, rows[0]?.length], key).toEqual(SIZES[key]);
			for (const row of rows) expect(row.length, key).toBe(rows[0].length);
		}
	});

	it("registers each glyph as a valid asset source", () => {
		for (const key of KEYS) {
			expect(
				isClassicyAssetSource(
					resolveClassicyAsset("systemArt", key, "platinum"),
				),
				key,
			).toBe(true);
		}
	});

	it("renders every glyph exactly as the deleted row modules did", () => {
		for (const key of KEYS) {
			const { container, unmount } = render(
				createElement(ClassicyPixelArt, { art: key }),
			);
			const hash = createHash("sha256")
				.update(container.innerHTML)
				.digest("hex");
			expect(hash, key).toBe(MARKUP_BEFORE[key]);
			unmount();
		}
	});

	it("keeps the pixel art out of the --classicy-art-* variables", () => {
		const vars = renderHook(() => useClassicyAssetVars()).result.current;
		for (const key of KEYS) {
			expect(vars, key).not.toHaveProperty(
				classicyAssetVarName("systemArt", key),
			);
		}
		// The image art is still there.
		expect(vars["--classicy-art-window-grip"]).toMatch(/^url\("/);
	});

	it("each .txt holds only token rows: no trailing newline, no carriage return", () => {
		const files = fs.readdirSync(dir).filter((n) => n.endsWith(".txt"));
		expect(files).toHaveLength(9);
		for (const f of files) {
			const text = fs.readFileSync(path.join(dir, f), "utf8");
			expect(text.endsWith("\n"), f).toBe(false);
			expect(text, f).not.toMatch(/\r/);
			expect(text, f).toMatch(/^[KW1-7bcdmn.]+(\n[KW1-7bcdmn.]+)*$/);
		}
	});
});
