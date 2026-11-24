import "@classicy/appearance-platinum";
import "@classicy/appearance-system7";
import path from "node:path";
import { compile, NodePackageImporter } from "sass";
import { afterAll, describe, expect, it } from "vitest";
import {
	registerClassicyAppearancePackage,
	unregisterClassicyAppearancePackage,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	getAllThemes,
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { CLASSICY_DEFAULT_THEME_METRICS } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";

// Story 0225-ci7 (the slider gap, after review K1): `ChangeTheme` may draw
// a theme of another package under Platinum, whose stylesheet then reads the
// variables that theme emits. A System 7 theme drawn under Platinum emitted
// no `--slider-*`, and Platinum's slider lost its channel, indicator and
// ticks (seen in the example app). Every variable Platinum's sheet reads
// without a fallback and Platinum's own themes emit must be emitted by any
// package's theme: by each registered package's, and by a theme of a
// package that declares nothing past the core five (completed from the
// core floor alone), so the floor carries every such knob.

const REPO = path.resolve(import.meta.dirname, "../..");
const css = compile(
	path.join(REPO, "packages/appearance/platinum/src/styles/platinum.scss"),
	{
		loadPaths: [
			path.join(REPO, "src"),
			path.join(REPO, "packages/appearance/platinum/src"),
		],
		importers: [new NodePackageImporter()],
	},
).css;

// Every `var(--name)` with no fallback in Platinum's own sheet.
const readsWithoutFallback = new Set(
	[...css.matchAll(/var\((--[\w-]+)\)/g)].map((m) => m[1]),
);

const emitted = (theme: Parameters<typeof getThemeVars>[0]) =>
	new Set(Object.keys(getThemeVars(theme)));

describe("Platinum's stylesheet under another package's theme", () => {
	const platinum = getTheme("default");
	const needed = [...readsWithoutFallback].filter((name) =>
		emitted(platinum).has(name),
	);

	it("reads theme variables without a fallback, the slider's among them", () => {
		expect(needed.length).toBeGreaterThan(40);
		for (const name of [
			"--slider-pixel",
			"--menu-frame-border-width",
			"--scrollbar-thumb-grip-width",
			"--checkbox-pixel",
			"--menu-mark-pixel",
		])
			expect(needed).toContain(name);
	});

	// A registered package whose themes declare only the core five: its
	// themes are completed from the core floor and nothing else (an
	// unregistered package's would borrow the default package's values).
	const BARE = "bare-package";
	const bare = {
		...platinum,
		id: BARE,
		name: "Bare",
		package: BARE,
		measurements: structuredClone(CLASSICY_DEFAULT_THEME_METRICS),
	};
	registerClassicyAppearancePackage({
		id: BARE,
		name: "Bare",
		css: "",
		defaults: bare,
		layout: {
			window: { growBoxCorner: "bottom-right" },
			menuBar: { placement: "screen" },
			desktop: { iconGridOrigin: "top-right" },
		},
	});
	afterAll(() => unregisterClassicyAppearancePackage(BARE));
	it.each([
		...getAllThemes()
			.filter((t) => t.package !== "platinum" && t.package !== BARE)
			.map((t) => [`${t.package}/${t.id}`, t] as const),
		["a package declaring only the core five", bare] as const,
	])("%s emits every one of them", (_name, theme) => {
		const own = emitted(theme);
		expect(needed.filter((name) => !own.has(name))).toEqual([]);
	});
});
