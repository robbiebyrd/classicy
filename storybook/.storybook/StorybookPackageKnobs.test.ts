import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import type { ClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackage";
import {
	getClassicyAppearancePackage,
	listClassicyAppearancePackages,
} from "@/Appearance/ClassicyAppearancePackageRegistry";
import { PLATINUM_APPEARANCE_PACKAGE_ID } from "@/Appearance/Platinum";
import platinumJson from "@/Appearance/Platinum/platinum.json";
import {
	type ClassicyTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { classicyMeasurementVarName } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyThemeMetrics";
import { MIRRORED_APPEARANCE_PACKAGE_ID } from "./MirroredPackage";
import { RENAMED_APPEARANCE_PACKAGE_ID } from "./RenamedPackage";
import { TEST_PACK_ID } from "./TestPackPackage";

// The core floor carries the structural knobs only (0015 §1.1). A package
// that draws with Platinum's stylesheet or mixins reads Platinum's look-only
// knobs too (`--control-strip-bevel-width`, `--menu-frame-*`, …), and must
// declare them in its themes: one it leaves out is a `var()` nothing sets, so
// the declaration reading it is invalid and the look silently changes (Test
// Pack's Control Strip lost its bevels that way). For every Storybook
// package, every knob variable its stylesheet reads must be one
// `getThemeVars` emits for each of its built-in themes. Reads are taken from
// the compiled stylesheet, as ClassicyAppearance.varCoverage.test.ts takes
// them from the sources.

// `?inline` SCSS is "" under vitest, so the registered `css` is empty: each
// package's stylesheet is compiled through the sass API. Test Pack and
// renamed register Platinum's stylesheet, rescoped. vitest's root is the
// repo root.
const PLATINUM_SCSS = "src/Appearance/Platinum/styles/platinum.scss";
const STYLESHEETS: Readonly<Record<string, string>> = {
	[PLATINUM_APPEARANCE_PACKAGE_ID]: PLATINUM_SCSS,
	[MIRRORED_APPEARANCE_PACKAGE_ID]: "storybook/.storybook/mirrored.scss",
	[RENAMED_APPEARANCE_PACKAGE_ID]: PLATINUM_SCSS,
	[TEST_PACK_ID]: PLATINUM_SCSS,
};

const compiled = new Map<string, string>();
const compile = (file: string): string => {
	let css = compiled.get(file);
	if (css === undefined) {
		css = sass.compile(path.resolve(process.cwd(), file), {
			style: "expanded",
		}).css;
		compiled.set(file, css);
	}
	return css;
};

const READ = /var\(\s*(--[a-zA-Z0-9-]+)/g;
const reads = (css: string): Set<string> =>
	new Set([...css.matchAll(READ)].map((match) => match[1]));

type Measurements = Record<string, Record<string, unknown>>;
const knobNames = (measurements: Measurements): string[] =>
	Object.entries(measurements).flatMap(([family, keys]) =>
		Object.keys(keys).map((key) => classicyMeasurementVarName(family, key)),
	);

// The knob namespace: every measurement variable Platinum declares (the
// families its stylesheet reads), plus the package's own.
const knobNamespace = (pkg: ClassicyAppearancePackage): Set<string> =>
	new Set([
		...knobNames(platinumJson.defaults.measurements as Measurements),
		...knobNames(pkg.defaults.measurements as unknown as Measurements),
	]);

const builtIns = (pkg: ClassicyAppearancePackage): ClassicyTheme[] => [
	pkg.defaults,
	...(pkg.presets ?? []),
];

/** Each built-in theme's knob reads that its variables leave unset. */
const unsetKnobReads = (pkg: ClassicyAppearancePackage): string[] => {
	const read = reads(compile(STYLESHEETS[pkg.id]));
	const namespace = knobNamespace(pkg);
	return builtIns(pkg).flatMap((theme) => {
		const emitted = new Set(Object.keys(getThemeVars(theme)));
		return [...read]
			.filter((name) => namespace.has(name) && !emitted.has(name))
			.map((name) => `${theme.id}: ${name}`);
	});
};

describe("Storybook Appearance Packages declare every knob they read", () => {
	it("maps every package the .storybook modules register to its stylesheet", () => {
		expect(
			listClassicyAppearancePackages()
				.map((pkg) => pkg.id)
				.sort(),
		).toEqual(Object.keys(STYLESHEETS).sort());
	});

	it("reads Platinum's look-only knobs from these stylesheets", () => {
		// The guard means something only while the stylesheets read them.
		const read = reads(compile(PLATINUM_SCSS));
		expect(read).toContain("--control-strip-bevel-width");
		expect(read).toContain("--menu-frame-shadow-width");
	});

	it.each(
		Object.keys(STYLESHEETS),
	)("%s: every knob its stylesheet reads is set by each built-in theme", (id) => {
		const pkg = getClassicyAppearancePackage(id);
		expect(pkg, id).toBeDefined();
		if (pkg) expect(unsetKnobReads(pkg)).toEqual([]);
	});
});
