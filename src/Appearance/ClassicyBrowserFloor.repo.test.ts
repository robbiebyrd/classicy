import { globSync } from "node:fs";
import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import {
	type ClassicyCssRule,
	classicyCssRules,
	splitClassicySelectorList,
} from "../../bin/classicyCssCascade";
import { findClassicyCssFloorProblems } from "../../bin/classicyCssFloor";

/**
 * The browser floor (README: Chrome 120, Safari 16.2, Firefox 113) for CSS
 * math: every compiled stylesheet in the repo (the core's component sheets,
 * each workspace Appearance Package's stylesheet and Storybook's mirrored
 * package) gives each declaration calling a function newer than the floor,
 * such as `round()`, a fallback the floor parses
 * (bin/classicyCssFloor.ts). verify:dist checks the shipped stylesheets the
 * same way.
 */

// Compiling every sheet takes a few seconds alone; sized for a loaded
// machine, like the cascade scan.
const SCAN_TIMEOUT_MS = 60_000;

const root = process.cwd();
const sheets = [
	...globSync("src/**/*.scss").filter(
		(f) =>
			!f.split(path.sep).includes("Appearance") &&
			!path.basename(f).startsWith("_"),
	),
	...globSync("packages/appearance/*/src/styles/*.scss").filter(
		(f) => !path.basename(f).startsWith("_"),
	),
	"storybook/.storybook/mirrored.scss",
]
	.map((f) => f.split(path.sep).join("/"))
	.sort();

const compiled = new Map<string, string>();
const compile = (file: string): string => {
	const known = compiled.get(file);
	if (known !== undefined) return known;
	const css = sass.compile(path.resolve(root, file), {
		style: "expanded",
		loadPaths: [path.resolve(root, "src")],
		importers: [new sass.NodePackageImporter()],
	}).css;
	compiled.set(file, css);
	return css;
};

describe("the browser floor's CSS math", () => {
	it("covers the core's sheets and every package's", () => {
		expect(sheets).toContain(
			"src/SystemFolder/SystemResources/Slider/ClassicySlider.scss",
		);
		expect(sheets).toContain(
			"packages/appearance/platinum/src/styles/platinum.scss",
		);
		expect(sheets).toContain(
			"packages/appearance/system7/src/styles/system7.scss",
		);
	});

	it(
		"every declaration calling a newer function has a fallback",
		() => {
			const problems = sheets.flatMap((file) =>
				findClassicyCssFloorProblems(file, compile(file)),
			);
			expect(problems).toEqual([]);
		},
		SCAN_TIMEOUT_MS,
	);
});

/**
 * `:has()` is Firefox 121's, above the floor, and a browser without it drops
 * a whole rule whose selector holds it. A rule a Firefox 113-120 user needs
 * keys on a class the component sets instead (the alert's button row, the
 * slider's ghost, the chosen tab, an item drawn with an image, the little
 * arrows' and the movable alert's windows...). A `:has()` rule left in a
 * compiled sheet must be one of these, each with its fallback in the same
 * sheet.
 */
type HasFallback = {
	/** The `:has()` selectors it covers (a package's scope taken off). */
	selector: RegExp;
	/** Why the fallback is enough. */
	reason: string;
	/**
	 * The fallback's selector, which a rule outside `:has()` must hold with
	 * the same declarations; or, for a fallback of another shape, whether the
	 * sheet holds it.
	 */
	fallback:
		| { twin: (selector: string) => string }
		| { present: (rules: ClassicyCssRule[]) => boolean };
};

const declarationsOf = (rule: ClassicyCssRule) =>
	JSON.stringify(rule.declarations);

const HAS_FALLBACKS: HasFallback[] = [
	{
		selector: /:has\(> \.classicyWindowMenuBar\)/,
		reason:
			"ClassicyWindow sets classicyWindowWithMenuBar whenever it draws the bar; the :has() twin covers a bar placed some other way",
		fallback: {
			twin: (selector) =>
				selector.replace(
					":has(> .classicyWindowMenuBar)",
					".classicyWindowWithMenuBar",
				),
		},
	},
	{
		selector: /\.classicyDesktopMenu > :has\(> \[data-classicy-part=[a-z]+\]\)/,
		reason:
			"the plain rule on the part comes first; the :has() twin reaches a part a balloon anchor wraps",
		fallback: {
			twin: (selector) => selector.replace(/:has\(> (\[[^\]]+\])\)/, "$1"),
		},
	},
	{
		selector:
			/^html\.classicyScreenSaverActive:has\(#classicy-screen-saver-overlay\)/,
		reason:
			"the overlay's own id rule hides the pointer over the full-viewport overlay",
		fallback: {
			twin: (selector) =>
				selector.replace(
					/^html\.classicyScreenSaverActive:has\((#classicy-screen-saver-overlay)\)/,
					"$1",
				),
		},
	},
	{
		selector: /^:where\((html|body)(:has| > \*)/,
		reason:
			"@supports not selector(:has(*)) gives the desktop the window's height itself",
		fallback: {
			present: (rules) =>
				rules.some((rule) =>
					rule.context.includes("@supports not selector(:has(*))"),
				),
		},
	},
];

describe("the browser floor's :has()", () => {
	it(
		"every :has() rule left in a compiled sheet has its fallback",
		() => {
			const problems: string[] = [];
			for (const file of sheets) {
				const rules = classicyCssRules(compile(file));
				for (const rule of rules) {
					if (!rule.selector.includes(":has(")) continue;
					for (const selector of splitClassicySelectorList(rule.selector)) {
						if (!selector.includes(":has(")) continue;
						// A package sheet scopes every rule under its root.
						const bare = selector.replace(
							/^\.classicyDesktop\[data-classicy-appearance=[\w-]+\] /,
							"",
						);
						const known = HAS_FALLBACKS.find((entry) =>
							entry.selector.test(bare),
						);
						if (!known) {
							problems.push(
								`${file}: \`${selector}\` keys on :has(), which Firefox 113-120 lacks -> key it on a class the component sets`,
							);
							continue;
						}
						const { fallback } = known;
						const ok =
							"present" in fallback
								? fallback.present(rules)
								: rules.some(
										(other) =>
											!other.selector.includes(":has(") &&
											splitClassicySelectorList(other.selector).includes(
												fallback.twin(selector),
											) &&
											declarationsOf(other) === declarationsOf(rule),
									);
						if (!ok)
							problems.push(
								`${file}: \`${selector}\` has no fallback (${known.reason})`,
							);
					}
				}
			}
			expect(problems).toEqual([]);
		},
		SCAN_TIMEOUT_MS,
	);
});
