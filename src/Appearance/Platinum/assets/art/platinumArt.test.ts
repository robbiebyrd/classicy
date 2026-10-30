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
 * Art that is not a mask. The title-bar stripes and the windoid texture are
 * images in their original colors (owner ruling E20: a mask cannot blend
 * their row boundaries as the one image does); the grip, dither and strikes
 * stay images (their grays are the art); the arrow cursor is a cursor. (The
 * four title-bar cap SVGs are gone: the Phase 0 cap measurement found them
 * never drawn, Ruling E13.)
 */
const NOT_MASKS = [
	"title-bar-center.svg",
	"title-bar-center-red.svg",
	"title-bar-utility.svg",
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

/** Each row path's `y` and class, in document order. */
const rows = (svg: string): [number, string][] =>
	[...svg.matchAll(/<path\b[^>]*>/g)].map(([path]) => [
		Number(/d="M-?[\d.]+[ ,]([\d.]+)/.exec(path)?.[1]),
		/class="([^"]*)"/.exec(path)?.[1] ?? "",
	]);

describe("Platinum window, menu, slider and tab art", () => {
	it("registers every Part E key as an asset source", () => {
		for (const key of [
			"windowStripes",
			"windowStripesRed",
			"windowUtilityTexture",
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

	// The stripes are the original art, drawn as images: twelve one-unit rows
	// alternating light and dark, over the original viewBoxes (the gray rows
	// overhang a 11.53-wide box by 0.24 on each side), so the tile keeps its
	// size and the rows their colors.
	it("pins the stripe art", () => {
		const s = read("title-bar-center.svg");
		expect(s).toContain('viewBox="0 0 11.53 12"');
		expect(s).toContain(".cls-1{fill:#fff}.cls-2{fill:#787878}");
		expect(rows(s)).toEqual(
			Array.from({ length: 12 }, (_, y) => [y, y % 2 ? "cls-2" : "cls-1"]),
		);
		for (const row of s.match(/<path\b[^>]*>/g) ?? [])
			expect(row).toMatch(/d="M-\.24 \d+h12\.01v1H-\.24z"/);
		const r = read("title-bar-center-red.svg");
		expect(r).toContain('viewBox="0 0 12.01 12"');
		expect(r).toMatch(/\.cls-1 \{\s*fill: #ef8c89;/);
		expect(r).toMatch(/\.cls-2 \{\s*fill: #f9dada;/);
		expect(rows(r)).toEqual(
			Array.from({ length: 12 }, (_, y) => [y, y % 2 ? "cls-2" : "cls-1"]),
		);
	});

	// The windoid texture: two radial gradients over the frame gray, in a
	// 4x4 box the band tiles at 4px 3px.
	it("pins the windoid texture", () => {
		const u = read("title-bar-utility.svg");
		expect(u).toContain('viewBox="0 0 4 4"');
		expect(u).toContain('<rect width="4" height="4" fill="#ccc"/>');
		expect(u).toContain('cx="2.6" cy="2.6" r="1.5"');
		expect(u).toContain('cx="1.3" cy="1.3" r="1.5"');
		expect(u).not.toMatch(/<svg[^>]*\s(width|height)=/);
	});
});
