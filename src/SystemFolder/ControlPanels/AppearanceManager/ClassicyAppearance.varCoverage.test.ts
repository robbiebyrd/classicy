import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, relative, resolve, sep } from "node:path";
import { describe, expect, it } from "vitest";
// getTheme/getAllThemes serve the registered packages' themes: Platinum's
// and System 7's.
import "@classicy/appearance-platinum";
import "@classicy/appearance-system7";
import { getClassicyAppearancePackage } from "@/Appearance/ClassicyAppearancePackageRegistry";
import {
	getTheme,
	getThemeVars,
} from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { scanPixelLiterals } from "../../../../bin/check-pixel-literals.ts";
import {
	blankClassicyScssComments,
	classicyScssSourceRoots,
	listClassicyScssFiles,
} from "../../../../bin/classicyScssSource.ts";

// H 6.1: with the `var(--x, Npx)` fallbacks gone, a stylesheet read of a
// variable nothing sets is an invalid declaration (a `width` that computes to
// `auto`, a `gap` of 0). Every read must therefore be a variable
// `getThemeVars` emits, a custom property a stylesheet declares itself, one a
// component sets from TypeScript, or one of the desktop root's asset and
// layout variables (`useClassicyAssetVars`, `classicyLayoutVars`).
const ROOT = resolve(__dirname, "../../../..");
// The screen savers Platinum ships (plan 0016-vbq §2.1).
const SAVERS = "packages/appearance/platinum/src/screenSavers/";

const repoPath = (full: string): string =>
	relative(ROOT, full).split(sep).join("/");

// src and each workspace Appearance Package's src (Platinum's, plan 0015-kxa
// §3.1), the roots the SCSS gates scan.
const SOURCE_ROOTS = classicyScssSourceRoots(ROOT);

const scssFiles = SOURCE_ROOTS.flatMap((dir) =>
	listClassicyScssFiles(dir),
).filter((full) => !repoPath(full).startsWith(SAVERS));

// Library TypeScript only: a variable set by a test or a story alone is not
// set for a host.
const listLibraryScripts = (dir: string): string[] =>
	readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const full = join(dir, entry.name);
		if (entry.isDirectory()) {
			return entry.name === "__tests__" ? [] : listLibraryScripts(full);
		}
		return /\.tsx?$/.test(entry.name) &&
			!/\.(test|stories)\.tsx?$/.test(entry.name)
			? [full]
			: [];
	});

// The first group each match captured.
const matchesIn = (text: string, pattern: RegExp): string[] =>
	[...text.matchAll(pattern)].map(
		(match) => match.slice(1).find((group) => group !== undefined) ?? "",
	);

const READ = /var\(\s*(--[a-zA-Z0-9-]+)/g;
const DECLARED = /^\s*(--[a-zA-Z0-9-]+)\s*:/gm;
// A set, not a read: a style-object key (`"--x": value`) or a
// `setProperty("--x", …)` call. A `readClassicyThemeVar("--x")` mention does
// not count.
const SET_FROM_SCRIPT =
	/["'](--[a-zA-Z0-9-]+)["']\s*:|setProperty\(\s*["'](--[a-zA-Z0-9-]+)["']/g;
const DESKTOP_ROOT_PREFIX = /^--classicy-(art|cursor|layout)-/;

// Variables nothing in Classicy sets, left for a host (or a package) to set:
// every read of one carries its own fallback, so it is never invalid.
const HOST_HOOKS = [
	// ClassicyWindowMenuBar.scss: the window menu bar's height, else the
	// derived control × 1.75 (docs/AGENT-REFERENCE.md).
	"--classicy-window-menu-bar-height",
	// HyperCard.scss: the card transitions' length, else 300ms
	// (HC_TRANSITION_MS, HyperCardTransition.tsx).
	"--hc-transition-duration",
];

const sheets = scssFiles.map((full) =>
	blankClassicyScssComments(readFileSync(full, "utf8")),
);

// A workspace Appearance Package's sheet may also read what its own themes
// emit beyond the default theme's: the knob families only it declares
// (System 7's `titleBar`, `windowBox`, `growBox`). Keyed by package id.
const PACKAGE_SHEET = /^packages\/appearance\/([^/]+)\/src\//;
const packageOf = (full: string): string | undefined =>
	PACKAGE_SHEET.exec(repoPath(full))?.[1];
const packageThemeVars = new Map<string, Set<string>>();
const themeVarsOfPackage = (id: string): Set<string> => {
	let vars = packageThemeVars.get(id);
	if (!vars) {
		const pkg = getClassicyAppearancePackage(id);
		vars = new Set(
			[pkg?.defaults, ...(pkg?.presets ?? [])].flatMap((theme) =>
				theme ? Object.keys(getThemeVars(theme)) : [],
			),
		);
		packageThemeVars.set(id, vars);
	}
	return vars;
};

describe("theme variable coverage (H 6.1)", () => {
	it("every var(--…) read in src's and the packages' SCSS is emitted, declared or set from TSX", () => {
		const reads = new Set(
			sheets.flatMap((sheet, index) =>
				matchesIn(sheet, READ).filter(
					(name) =>
						!themeVarsOfPackage(packageOf(scssFiles[index]) ?? "").has(name),
				),
			),
		);
		const allowed = new Set([
			...Object.keys(getThemeVars(getTheme("default"))),
			...sheets.flatMap((sheet) => matchesIn(sheet, DECLARED)),
			...SOURCE_ROOTS.flatMap(listLibraryScripts).flatMap((full) =>
				matchesIn(readFileSync(full, "utf8"), SET_FROM_SCRIPT),
			),
			...HOST_HOOKS,
		]);
		expect(
			[...reads]
				.filter((name) => !allowed.has(name) && !DESKTOP_ROOT_PREFIX.test(name))
				.sort(),
		).toEqual([]);
	});

	// Platinum's sheets and scripts, in its workspace package (plan 0015-kxa
	// §3.1), are read too: `--menu-frame-shadow-width` is read only there.
	it("scans each workspace Appearance Package's source", () =>
		expect(
			new Set(sheets.flatMap((sheet) => matchesIn(sheet, READ))),
		).toContain("--menu-frame-shadow-width"));

	it("reads a host hook only with a fallback", () => {
		for (const hook of HOST_HOOKS) {
			const reads = sheets.flatMap((sheet) =>
				matchesIn(sheet, new RegExp(`var\\(\\s*${hook}\\s*([,)])`, "g")),
			);
			expect(reads.length, hook).toBeGreaterThan(0);
			expect(
				reads.filter((next) => next !== ","),
				hook,
			).toEqual([]);
		}
	});

	it("no var() fallback carries a pixel literal", () =>
		expect(
			[...scanPixelLiterals(ROOT).values()]
				.flat()
				.filter((literal) => literal.kind === "fallback")
				.map((literal) => `${literal.file}:${literal.line} ${literal.text}`),
		).toEqual([]));

	it("no bare pixel literal is left in src, and there is no allowlist", () => {
		expect(
			[...scanPixelLiterals(ROOT).values()]
				.flat()
				.map((literal) => `${literal.file}:${literal.line} ${literal.text}`),
		).toEqual([]);
		expect(existsSync(join(ROOT, "bin/pixel-literal-allowlist.json"))).toBe(
			false,
		);
	});
});
