import "@/Appearance/Platinum";
import fs from "node:fs";
import path from "node:path";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	resolveClassicyAsset,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import { isClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";

const dir = path.join(process.cwd(), "src/Appearance/Platinum/assets/art");
const read = (file: string): string =>
	fs.readFileSync(path.join(dir, file), "utf8");

/**
 * Art that is not a mask. The grip, dither and strikes stay images (their
 * grays are the art); the arrow cursor is a cursor; the four title-bar caps
 * stay verbatim and unregistered until the Phase 0 cap measurement decides
 * whether they are drawn at all (Ruling E13).
 */
const NOT_MASKS = [
	"resizer.svg",
	"corner-dither.svg",
	"slider-strikes.svg",
	"cursor-arrow.svg",
	"title-bar-left.svg",
	"title-bar-right.svg",
	"title-bar-left-red.svg",
	"title-bar-right-red.svg",
];

describe("Platinum window, menu, slider and tab art", () => {
	it("registers every Part E key as an asset source", () => {
		for (const key of [
			"windowStripes",
			"windowStripesRed",
			"windowUtilityShade",
			"windowUtilityHighlight",
			"windowGrip",
			"windowDither",
			"zoomGlyph",
			"collapseGlyph",
			"submenuArrow",
			"popupArrows",
			"sliderThumb",
			"sliderThumbRect",
			"sliderStrikes",
			"tabOutline",
			"halftone",
		])
			expect(
				isClassicyAssetSource(
					resolveClassicyAsset("systemArt", key, "platinum"),
				),
			).toBe(true);
	});

	it("exposes the art as --classicy-art-* url() variables", () => {
		const vars = renderHook(() => useClassicyAssetVars()).result.current;
		expect(vars["--classicy-art-window-stripes"]).toMatch(/^url\("/);
		expect(vars["--classicy-art-slider-thumb-rect"]).toMatch(/^url\("/);
	});

	it("mask files carry no baked color and no intrinsic size", () => {
		const masks = fs
			.readdirSync(dir)
			.filter((n) => n.endsWith(".svg") && !NOT_MASKS.includes(n));
		expect(masks.length).toBeGreaterThan(0);
		for (const f of masks) {
			const svg = read(f);
			expect(svg, f).not.toMatch(/#[0-9a-f]{3,6}/i);
			expect(svg, f).toMatch(/currentColor/);
			expect(svg, f).not.toMatch(/<svg[^>]*\s(width|height)=/);
		}
	});

	it("pins the stripe geometry", () => {
		const s = read("title-bar-center.svg");
		expect(s).toContain('viewBox="0 0 11.53 12"');
		expect(s.match(/<rect /g)).toHaveLength(6);
		expect(s).toContain('x="-0.24"');
		expect(s).toContain('width="12.01"');
		expect(s).toContain('y="1"');
		expect(s).not.toContain('y="0"');
		const r = read("title-bar-center-red.svg");
		expect(r).toContain('viewBox="0 0 12.01 12"');
		expect(r.match(/<rect /g)).toHaveLength(6);
		expect(r).toContain('y="0"');
		expect(r).not.toContain('y="1"');
	});
});
