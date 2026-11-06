import { readdirSync, readFileSync } from "node:fs";
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

// Modules in storybook/.storybook that register a package but are exempt
// from the stylesheet map, each with its reason.
const EXEMPT_MODULES: Readonly<Record<string, string>> = {
	// Registers only while a probe story is mounted (never at import), and
	// its CSS is an inline outline rule that reads no theme variable.
	"ClassicyAppearanceProbe.tsx": "storybook-probe",
};

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
const DECLARED = /(?:^|[;{\s])(--[a-zA-Z0-9-]+)\s*:/g;
const declares = (css: string): Set<string> =>
	new Set([...css.matchAll(DECLARED)].map((match) => match[1]));

const STORYBOOK_DIR = path.resolve(process.cwd(), "storybook/.storybook");
const REGISTERS = /\bregisterClassicyAppearancePackage\(/;

/** The storybook/.storybook modules that call registerClassicyAppearancePackage. */
const registeringModules = (): string[] =>
	readdirSync(STORYBOOK_DIR)
		.filter(
			(name) =>
				/\.tsx?$/.test(name) &&
				!/\.test\.tsx?$/.test(name) &&
				REGISTERS.test(readFileSync(path.join(STORYBOOK_DIR, name), "utf8")),
		)
		.sort();

/** Imports `file` and returns the package ids its evaluation registered. */
const idsRegisteredBy = async (file: string): Promise<string[]> => {
	const before = new Set(listClassicyAppearancePackages().map((p) => p.id));
	await import(/* @vite-ignore */ path.join(STORYBOOK_DIR, file));
	return listClassicyAppearancePackages()
		.map((p) => p.id)
		.filter((id) => !before.has(id));
};

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

const kebab = (name: string): string =>
	name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);

/**
 * Each built-in theme's knob reads that its variables leave unset: a read in
 * the knob namespace, or a read under the prefix of a family the theme
 * carries (`--control-strip-…`) whose key it lacks. A variable the
 * stylesheet declares itself is not a knob read.
 */
const unsetKnobReads = (pkg: ClassicyAppearancePackage): string[] => {
	const css = compile(STYLESHEETS[pkg.id]);
	const declared = declares(css);
	const read = [...reads(css)].filter((name) => !declared.has(name));
	const namespace = knobNamespace(pkg);
	return builtIns(pkg).flatMap((theme) => {
		const emitted = new Set(Object.keys(getThemeVars(theme)));
		const prefixes = Object.keys(theme.measurements).map(
			(family) => `--${kebab(family)}-`,
		);
		return read
			.filter(
				(name) =>
					!emitted.has(name) &&
					(namespace.has(name) ||
						prefixes.some((prefix) => name.startsWith(prefix))),
			)
			.map((name) => `${theme.id}: ${name}`);
	});
};

describe("Storybook Appearance Packages declare every knob they read", () => {
	// Found by scanning the sources, not by what this file imports, so a new
	// storybook/.storybook/FooPackage.ts fails here until it is mapped.
	it("maps every package a storybook/.storybook module registers to its stylesheet", async () => {
		const modules = registeringModules();
		expect(modules).toContain("TestPackPackage.ts");
		const unmapped: string[] = [];
		for (const file of modules) {
			const ids = await idsRegisteredBy(file);
			if (Object.hasOwn(EXEMPT_MODULES, file)) {
				// An exempt module must stay what its reason says: it registers
				// nothing when imported.
				expect(ids, file).toEqual([]);
				continue;
			}
			// Already registered by an earlier import (this file's own) counts.
			const registered = ids.length
				? ids
				: Object.keys(STYLESHEETS).filter((id) =>
						readFileSync(path.join(STORYBOOK_DIR, file), "utf8").includes(
							`"${id}"`,
						),
					);
			if (registered.length === 0) unmapped.push(`${file}: registers no id`);
			for (const id of registered)
				if (!Object.hasOwn(STYLESHEETS, id)) unmapped.push(`${file}: ${id}`);
		}
		expect(unmapped).toEqual([]);
		// And everything registered now has a stylesheet.
		expect(
			listClassicyAppearancePackages()
				.map((pkg) => pkg.id)
				.filter((id) => !Object.hasOwn(STYLESHEETS, id)),
		).toEqual([]);
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
