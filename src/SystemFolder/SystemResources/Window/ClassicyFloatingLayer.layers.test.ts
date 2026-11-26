import { describe, expect, it } from "vitest";
import {
	compileScss,
	cssRuleLookup,
	parseCssRules,
} from "@/__tests__/compiledCss";
import {
	CLASSICY_FLOATING_LAYER_STYLE,
	CLASSICY_FLOATING_LAYER_Z_INDEX,
} from "@/SystemFolder/SystemResources/Window/ClassicyFloatingLayer";

// Mac OS 8.5's Application Switcher palette is a system-wide floating window
// ("appears as a floating window", TN1142): dropped over the Control Strip
// it is drawn above the strip, hiding the modules beneath it, and dialogs
// still come above it (integration review G round 6, B5; audit-85
// `im85/sw-overstrip-rel.png`). The palette, like every floating extension
// window, draws in the desktop's floating layer, so the layer stacks above
// the strip and the palettes and under the modal bands.
const zIndexOf = (file: string, selector: string): number =>
	Number(
		cssRuleLookup(
			parseCssRules(compileScss(`src/SystemFolder/SystemResources/${file}`)),
		)(selector)["z-index"],
	);

describe("the floating layer's place among the desktop's layers", () => {
	const strip = zIndexOf(
		"ControlStrip/ClassicyControlStrip.scss",
		".classicyControlStrip",
	);
	const palettes = zIndexOf(
		"Window/ClassicyWindow.scss",
		".classicyWindowFloating",
	);
	const modalScrim = zIndexOf(
		"Window/ClassicyWindow.scss",
		".classicyWindowModalScrim",
	);

	it("reads the layers it is placed among", () => {
		expect([palettes, strip, modalScrim].every(Number.isFinite)).toBe(true);
	});

	it("is above the Control Strip and the palettes, and under the modal bands", () => {
		expect(CLASSICY_FLOATING_LAYER_STYLE.zIndex).toBe(
			CLASSICY_FLOATING_LAYER_Z_INDEX,
		);
		expect(CLASSICY_FLOATING_LAYER_Z_INDEX).toBeGreaterThan(strip);
		expect(CLASSICY_FLOATING_LAYER_Z_INDEX).toBeGreaterThan(palettes);
		expect(CLASSICY_FLOATING_LAYER_Z_INDEX).toBeLessThan(modalScrim);
	});
});
