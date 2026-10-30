import { readFileSync } from "node:fs";
import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
	resolveClassicyAsset,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import { platinumArt } from "@/Appearance/Platinum/assets/art/platinumArt";
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
		expect(platinumArt("halftone.svg")).toMatch(/\S/);
		expect(resolveClassicyAsset("systemArt", "halftone")).toBe(
			platinumArt("halftone.svg"),
		);
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

	it("the halftone art is a single-color shape, never a color-encoded data URI", () => {
		const svg = readFileSync(`${ART}/halftone.svg`, "utf8");
		expect(svg).toContain('viewBox="0 0 2.8 2.8"');
		expect(svg.match(/fill="currentColor"/g)).toHaveLength(2);
		expect(svg).not.toMatch(/#[0-9a-f]{3,6}|%23|width=|height=/i);
	});
});
