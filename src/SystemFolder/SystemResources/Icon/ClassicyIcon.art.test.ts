import { readFileSync } from "node:fs";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	resolveClassicyAsset,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import "@/Appearance/Platinum/assets/platinumAssets";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";

/**
 * The icon halftone's art (Part E 3.1). Under program ruling G16, Part E owns
 * only the art: Platinum registers `halftone` (the open-icon dot pattern) and
 * `halftoneLarge` (the pre-boot screen's dither) as system art, and the
 * desktop root publishes them as `--classicy-art-halftone` and
 * `--classicy-art-halftone-large`. The icon rules that read
 * `--classicy-art-halftone` (a token-painted `::before`, masked by it) belong
 * to Part G; their assertions land with whichever of E and G lands second.
 */

const ART = "src/Appearance/Platinum/assets/art";

describe("icon halftone art (Platinum package)", () => {
	it("registers the halftone and the large halftone as system art", () => {
		expect(resolveClassicyAsset("systemArt", "halftone")).toMatch(/\S/);
		expect(ClassicyIcons.ui.halftoneLarge).toMatch(/\S/);
		expect(resolveClassicyAsset("systemArt", "halftoneLarge")).toBe(
			ClassicyIcons.ui.halftoneLarge,
		);
	});

	it("publishes both as --classicy-art-halftone* variables", () => {
		const { result } = renderHook(() => useClassicyAssetVars());
		expect(result.current["--classicy-art-halftone"]).toBe(
			`url("${resolveClassicyAsset("systemArt", "halftone")}")`,
		);
		expect(result.current["--classicy-art-halftone-large"]).toBe(
			`url("${resolveClassicyAsset("systemArt", "halftoneLarge")}")`,
		);
	});

	// E17: `mask-image` URLs are fetched in CORS mode, so a host serving
	// dist/assets/ from another origin without CORS headers would lose the
	// open-icon dither. The halftone (0.36 kB) is registered inline instead.
	it("registers the halftone inline, so its mask needs no CORS fetch (E17)", () => {
		const src = resolveClassicyAsset("systemArt", "halftone") ?? "";
		expect(src).toMatch(/^data:image\/svg\+xml[,;]/);
		const body = src.slice(src.indexOf(",") + 1);
		const svg = /;base64,/.test(src)
			? Buffer.from(body, "base64").toString("utf8")
			: decodeURIComponent(body);
		expect(svg).toMatch(/viewBox=["']0 0 2\.8 2\.8["']/);
		expect(svg.match(/fill=["']currentColor["']/g)).toHaveLength(2);
		// The same art the file holds, not a second copy that could drift.
		const file = readFileSync(`${ART}/halftone.svg`, "utf8");
		for (const [, d] of file.matchAll(/ d="([^"]+)"/g))
			expect(svg).toContain(d);
		// Vitest inlines every small SVG, so the runtime value above cannot tell
		// an inline import from a file import; the library build can (lib mode
		// emits every other art file to dist/assets/). Pin the `?inline` import.
		const module = readFileSync(`${ART}/platinumArt.ts`, "utf8");
		expect(module).toMatch(
			/^import halftoneInline from "\.\/halftone\.svg\?inline";$/m,
		);
		expect(module).toMatch(/^\thalftone: halftoneInline,$/m);
	});

	it("the halftone art is a single-color shape, never a color-encoded data URI", () => {
		const svg = readFileSync(`${ART}/halftone.svg`, "utf8");
		expect(svg).toContain('viewBox="0 0 2.8 2.8"');
		expect(svg.match(/fill="currentColor"/g)).toHaveLength(2);
		expect(svg).not.toMatch(/#[0-9a-f]{3,6}|%23|width=|height=/i);
	});
});
