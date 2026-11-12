import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
// Registers Platinum's sound pack, which the core default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import {
	useClassicyFitsBarPolicy,
	useClassicyFitsScrollBars,
} from "./useClassicyFitsScrollBars";

const registerKeeping = () =>
	registerClassicyAppearancePackage({
		id: "test-fits-bars",
		name: "Fits Bars",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "test-fits-bars-default",
			package: "test-fits-bars",
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			scrollBar: { fitsBars: "shown" },
		},
	});

describe("useClassicyFitsScrollBars / useClassicyFitsBarPolicy", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());

	it("follows a package that keeps the bars, and overrides either way", () => {
		resetClassicyAppearancePackagesForTests();
		registerKeeping();
		expect(renderHook(() => useClassicyFitsScrollBars()).result.current).toBe(
			true,
		);
		expect(renderHook(() => useClassicyFitsBarPolicy()).result.current).toBe(
			"always",
		);
		expect(
			renderHook(() => useClassicyFitsBarPolicy(false)).result.current,
		).toBe("auto");
	});

	it("draws a list's bar only on overflow otherwise (Mac OS 8)", () => {
		expect(renderHook(() => useClassicyFitsScrollBars()).result.current).toBe(
			false,
		);
		expect(renderHook(() => useClassicyFitsBarPolicy()).result.current).toBe(
			"auto",
		);
		expect(
			renderHook(() => useClassicyFitsBarPolicy(true)).result.current,
		).toBe("always");
	});
});
