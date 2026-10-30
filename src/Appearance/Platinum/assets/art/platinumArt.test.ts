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
 * grays are the art); the arrow cursor is a cursor. (The four title-bar cap
 * SVGs are gone: the Phase 0 cap measurement found them never drawn, Ruling
 * E13.)
 */
const NOT_MASKS = [
	"resizer.svg",
	"corner-dither.svg",
	"slider-strikes.svg",
	"cursor-arrow.svg",
];

/** Every `fill`, `stroke` and `stop-color` attribute: [, name, value]. */
const PAINT = /\s(fill|stroke|stop-color)=["']([^"']*)["']/g;
const ALLOWED_PAINT = /^(currentColor|none|url\(#[\w-]+\))$/;
/** Every painted shape element. */
const SHAPE = /<(rect|path|polygon|polyline|circle|ellipse|line)\b[^>]*>/g;

/** The `y` of each `<rect>`, in document order. */
const rows = (svg: string): number[] =>
	[...svg.matchAll(/<rect [^>]*\sy="([^"]*)"/g)].map(([, y]) => Number(y));

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
			// No color can hide in CSS: no `style` attribute or element.
			expect(svg, f).not.toMatch(/\sstyle=|<style/);
			// Every paint is currentColor, none or a local gradient: no named
			// color (`stroke='black'`), no rgb().
			for (const [, attr, value] of svg.matchAll(PAINT)) {
				expect(value, `${f} ${attr}`).toMatch(ALLOWED_PAINT);
			}
			// No shape falls back to the implicit black fill.
			for (const [shape] of svg.matchAll(SHAPE)) {
				expect(shape, f).toMatch(/\s(fill|stroke)=/);
			}
		}
	});

	it("pins the stripe geometry", () => {
		const s = read("title-bar-center.svg");
		expect(s).toContain('viewBox="0 0 11.53 12"');
		expect(s.match(/<rect /g)).toHaveLength(6);
		expect(rows(s)).toEqual([1, 3, 5, 7, 9, 11]);
		for (const row of s.match(/<rect [^>]*>/g) ?? []) {
			expect(row).toContain('x="-0.24"');
			expect(row).toContain('width="12.01"');
			expect(row).toContain('height="1"');
		}
		const r = read("title-bar-center-red.svg");
		expect(r).toContain('viewBox="0 0 12.01 12"');
		expect(r.match(/<rect /g)).toHaveLength(6);
		expect(rows(r)).toEqual([0, 2, 4, 6, 8, 10]);
		for (const row of r.match(/<rect [^>]*>/g) ?? []) {
			expect(row).toContain('x="0"');
			expect(row).toContain('width="12.01"');
			expect(row).toContain('height="1"');
		}
	});
});
