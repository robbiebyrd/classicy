import { globSync, readFileSync } from "node:fs";
import path from "node:path";
import * as sass from "sass";
import { describe, expect, it } from "vitest";
import {
	classicyClassesMeet,
	classicyClassSets,
	classicyStylesheetClasses,
} from "@/Appearance/__tests__/classicyClassCooccurrence";
import {
	type ClassicySpecificity,
	classicyCssRules,
	classicySelectorSpecificity,
	classicySelectorSubject,
	compareClassicySpecificity,
	splitClassicySelectorList,
} from "../../../bin/classicyCssCascade";
import { CLASSICY_COMPONENT } from "./ClassicyVocabulary";
import vocabulary from "./ClassicyVocabulary.json";

/**
 * Every stylesheet under src resolves its states by source order and
 * specificity, never by `!important`, so a theme package (or a consumer's own
 * rule) can override any of them by the cascade alone. jsdom does no cascade,
 * so the rule order and the raised selectors that replaced `!important` are
 * pinned on the compiled stylesheets.
 */

// The cross-file scan compiles every component stylesheet (about 4 s alone);
// sized for a loaded machine, like the vocabulary scan.
const SCAN_TIMEOUT_MS = 60_000;

const compile = (file: string): string =>
	sass.compile(path.resolve(process.cwd(), "src/SystemFolder", file), {
		style: "expanded",
	}).css;

const ruleAt = (css: string, selector: string): number => {
	const i = `\n${css}`.indexOf(`\n${selector} {`);
	if (i < 0) throw new Error(`no rule for ${selector}`);
	return i;
};

const rule = (css: string, selector: string): Record<string, string> => {
	const start = ruleAt(css, selector);
	const body = `\n${css}`.slice(start).split("{")[1].split("}")[0];
	return Object.fromEntries(
		body
			.split(";")
			.map((d) => d.trim())
			.filter(Boolean)
			.map((d) => {
				const [prop, ...rest] = d.split(":");
				return [prop.trim(), rest.join(":").trim()];
			}),
	);
};

describe("repo-wide cascade hygiene", () => {
	it("no SCSS under src uses !important", () => {
		const files = globSync("src/**/*.scss");
		const hits = files.flatMap((f) =>
			readFileSync(f, "utf8")
				.split("\n")
				.map((l, i) => (l.includes("!important") ? `${f}:${i + 1}` : null))
				.filter(Boolean),
		);
		expect(hits).toEqual([]);
	});
});

describe("rules that replaced !important", () => {
	it("desktop icons: the alias badge's mask size follows the base mask", () => {
		const css = compile("SystemResources/Desktop/ClassicyDesktopIcon.scss");
		expect(
			ruleAt(css, ".classicyDesktopIconAliasBadge .classicyDesktopIconMask"),
		).toBeGreaterThan(ruleAt(css, ".classicyDesktopIconMask"));
		expect(
			rule(css, ".classicyDesktopIconAliasBadge .classicyDesktopIconMask")[
				"mask-size"
			],
		).toBe("100%");
	});

	it("icons: stacking is the base rule's 10 and the drag's 500 only", () => {
		for (const [file, root] of [
			[
				"SystemResources/Desktop/ClassicyDesktopIcon.scss",
				"classicyDesktopIcon",
			],
			["SystemResources/Icon/ClassicyIcon.scss", "classicyIcon"],
		]) {
			const css = compile(file);
			expect(rule(css, `.${root}`)["z-index"]).toBe("10");
			expect(rule(css, `:where(.${root}).dragging`)["z-index"]).toBe("500");
			expect(css.match(/z-index/g)).toHaveLength(2);
		}
	});

	it("desktop icons never draw the desktop's focus ring", () => {
		const css = compile("SystemResources/Desktop/ClassicyDesktopIcon.scss");
		expect(
			rule(css, ".classicyDesktop .classicyDesktopIcon:focus-visible").outline,
		).toBe("none");
	});

	it("menus: keyboard equivalents and disabled items beat the generic rules", () => {
		const css = compile("SystemResources/Menu/ClassicyMenu.scss");
		expect(
			rule(css, ".classicyMenuItem .classicyMenuItemKeyboardShortcut")[
				"font-size"
			],
		).toBe("var(--ui-font-size-caption)");
		expect(
			rule(css, ".classicyMenuItem.disabled:hover")["background-color"],
		).toBe("transparent");
	});

	it("menu bar widgets never highlight", () => {
		for (const [file, part] of [
			[
				"SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss",
				"classicyDesktopMenuTime",
			],
			[
				"SystemResources/Desktop/MenuBar/Widgets/Sound/ClassicyDesktopMenuWidgetSound.scss",
				"classicyDesktopMenuWidgetSound",
			],
		])
			expect(
				rule(compile(file), `.classicyDesktopMenu .${part}:hover`).background,
			).toBe("transparent");
	});

	it("the text editor's auto height follows its base height", () => {
		const css = compile("SystemResources/TextEditor/ClassicyTextEditor.scss");
		expect(ruleAt(css, ".classicyTextEditorAutoHeight")).toBeGreaterThan(
			ruleAt(css, ".classicyTextEditor"),
		);
	});

	it("the mini pop-up's square size outranks the control's own", () => {
		const css = compile("SystemResources/PopUpMenu/ClassicyPopUpMenu.scss");
		expect(
			rule(css, ".classicyPopUpMenu.classicyPopUpMenuSizeMini").width,
		).toBe("var(--popup-mini-size)");
	});

	it("disabled checkboxes and default radio buttons keep their borders", () => {
		// The checkbox borders are the Platinum package's (B 4.3a): its
		// partial's rules, compiled unscoped.
		const checkbox = sass.compileString(
			'@use "styles/components/Checkbox";\n@include Checkbox.checkbox;',
			{
				style: "expanded",
				loadPaths: [
					path.resolve(process.cwd(), "packages/appearance/platinum/src"),
				],
				importers: [new sass.NodePackageImporter()],
			},
		).css;
		expect(
			ruleAt(checkbox, ".classicyCheckbox.default:disabled"),
		).toBeGreaterThan(
			ruleAt(
				checkbox,
				".classicyCheckbox.default:checked, .classicyCheckbox.default:active",
			),
		);
		// Radio: the shared `:where(.root).state` form throughout, so the
		// default rule wins by order at (0,2,0), not by a third class.
		const radio = compile("SystemResources/RadioInput/ClassicyRadioInput.scss");
		const radioDefault = ruleAt(
			radio,
			":where(.classicyRadioInput).default:checked, :where(.classicyRadioInput).default:active",
		);
		const disabledChecked = ruleAt(
			radio,
			":where(.classicyRadioInput):disabled:checked",
		);
		expect(disabledChecked).toBeGreaterThan(
			ruleAt(radio, ".classicyRadioInput:checked"),
		);
		expect(radioDefault).toBeGreaterThan(disabledChecked);
		expect(radioDefault).toBeGreaterThan(
			ruleAt(radio, ":where(.classicyRadioInput.mixed):disabled:checked"),
		);
		expect(radio).not.toMatch(/\.classicyRadioInput\.default/);
	});

	it("bouncing balls keep their per-ball timing in the stylesheet", () => {
		const css = compile(
			"Extensions/ScreenSaver/savers/BouncingBall/ClassicyScreenSaverBouncingBall.scss",
		);
		for (let i = 0; i < 12; i++) {
			const animation = rule(
				css,
				`.classicySaverBouncingBallBall:nth-child(${i + 1})`,
			).animation;
			const seconds = animation.match(/-?[\d.]+s/g)?.map(Number.parseFloat);
			// The timing the component used to write inline, ball by ball.
			expect(seconds).toEqual([
				Number((3.4 + i * 0.55).toFixed(2)),
				-Number((i * 0.9).toFixed(2)) || 0,
				Number((3 + i * 0.42).toFixed(2)),
				-Number((i * 1.3).toFixed(2)) || 0,
			]);
		}
	});

	it("the screen saver's overrides key on the overlay's id", () => {
		const css = compile("Extensions/ScreenSaver/ClassicyScreenSaver.scss");
		expect(css).toContain(
			"html.classicyScreenSaverActive:has(#classicy-screen-saver-overlay) *",
		);
		expect(css).toContain("#classicy-screen-saver-overlay *");
	});

	it("the screen saver hides the pointer without :has() too", () => {
		// A browser without :has() (Firefox before 121, Safari before 15.4)
		// drops the whole :has() rule; this one, on the full-viewport overlay
		// and its subtree, still hides the pointer there at id weight.
		const css = compile("Extensions/ScreenSaver/ClassicyScreenSaver.scss");
		const fallback = classicyCssRules(css).find(
			(r) =>
				!r.selector.includes(":has(") &&
				r.declarations.some(([p, v]) => p === "cursor" && v === "none") &&
				splitClassicySelectorList(r.selector).includes(
					"#classicy-screen-saver-overlay *",
				),
		);
		expect(fallback?.selector).toBe(
			"#classicy-screen-saver-overlay,\n#classicy-screen-saver-overlay *",
		);
		expect(fallback?.context).toEqual([]);
	});
});

/**
 * Vite concatenates the component stylesheets in import order, one
 * `@layer classicy.base` block each, so between two files the later block
 * wins a tie. A cross-file override (the Control Strip restyling its bevel
 * buttons, the menu bar hiding the submenu triangle) must therefore win by
 * specificity, never by coming later: reordering two imports must not flip
 * it (plan 0003-7x7, residual risk 2). The Appearance Packages are outside
 * this: each compiles to one stylesheet, ordered by its own includes.
 *
 * Two rules meet on an element when their subjects share a class or name
 * classes that can sit on one element, which classicyClassCooccurrence.ts
 * derives from the components' JSX (a help button is also a bevel button),
 * pinned against the rendered DOM by ClassicyClassCooccurrence.test.tsx.
 * A subject with no non-state class (`li:after`) is not compared; pin such
 * an override in KNOWN_OVERRIDES.
 */
describe("cross-file overrides do not depend on import order", () => {
	const STATES = new Set<string>(vocabulary.states);
	// The component stylesheets: every compiled SCSS under src except the
	// Appearance Packages' and the partials.
	const sheets = globSync("src/**/*.scss")
		.map((f) => f.split(path.sep).join("/"))
		.filter(
			(f) =>
				!f.startsWith("src/Appearance/") && !path.basename(f).startsWith("_"),
		)
		.sort();

	type Declaration = {
		file: string;
		selector: string;
		/** The subject's non-state classes. */
		classes: string[];
		property: string;
		value: string;
		specificity: ClassicySpecificity;
	};
	let cache: Map<string, Declaration[]> | undefined;
	/**
	 * Every declaration of every component stylesheet whose subject names a
	 * non-state class, keyed by its pseudo-element and property. At-rule
	 * context is ignored: a rule under a matching @media ties with one
	 * outside it.
	 */
	const declarationsByTarget = (): Map<string, Declaration[]> => {
		if (cache) return cache;
		cache = new Map();
		for (const file of sheets) {
			const css = sass.compile(path.resolve(process.cwd(), file), {
				style: "expanded",
				loadPaths: [path.resolve(process.cwd(), "src")],
			}).css;
			for (const rule of classicyCssRules(css))
				for (const selector of splitClassicySelectorList(rule.selector)) {
					const { classes, pseudoElement } = classicySelectorSubject(selector);
					const specificity = classicySelectorSpecificity(selector);
					const targets = classes.filter((c) => !STATES.has(c));
					if (!targets.length) continue;
					for (const [property, value] of rule.declarations) {
						const key = `${pseudoElement}|${property}`;
						const list = cache.get(key) ?? [];
						list.push({
							file,
							selector,
							classes: targets,
							property,
							value,
							specificity,
						});
						cache.set(key, list);
					}
				}
		}
		return cache;
	};

	const tieKey = (a: string, b: string) => [a, b].sort().join("  |  ");

	/**
	 * Cross-file pairs that tie in specificity and set one property to
	 * different values, yet never decide an element's style, with why.
	 */
	const FRAME =
		"ClassicyWindowFrame is the presentational frame for outside a running desktop (its TSDoc: inside an app use ClassicyWindow); a frame is never inside a window, so these never match one title bar";
	const STRIP_IN_TOOLBAR =
		"Control Strip modules are drawn only by ClassicyControlStrip, never in a ClassicyButtonToolbar";
	const HELP_IN_TOOLBAR =
		"a help button in a small or medium toolbar is icon-only, so square, and the toolbar's three-class square rule sets its width and padding over both";
	const HELP_SQUARE =
		"a help button is square only in a toolbar (it never passes `square`, so isSquare needs the toolbar context), and every toolbar size's three-class square rule sets its width over both";
	const TIES_THAT_NEVER_MEET: Record<string, string> = {
		[tieKey(
			".classicyWindow .classicyWindowTitleBar .classicyWindowControlBox",
			".classicyWindowFrame .classicyWindowTitleBar .classicyWindowControlBox",
		)]: FRAME,
		[tieKey(
			".classicyWindow .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleText",
			".classicyWindowFrame .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleText",
		)]: FRAME,
		[tieKey(
			".classicyWindowFrame .classicyWindowTitleBar",
			".classicyWindowUtility .classicyWindowTitleBar",
		)]: FRAME,
		[tieKey(
			".classicyWindowFrame > .classicyWindowTitleBar",
			".classicyWindowUtility .classicyWindowTitleBar",
		)]: FRAME,
		[tieKey(
			".classicyWindowFrame .classicyWindowTitleBar .classicyWindowControlBox",
			".classicyWindowUtility .classicyWindowTitleBar .classicyWindowControlBox",
		)]: FRAME,
		[tieKey(
			".classicyWindowFrame .classicyWindowTitleBar .classicyWindowControlBox",
			":where(.classicyWindow).active .classicyWindowTitleBar .classicyWindowControlBox",
		)]: FRAME,
		[tieKey(
			".classicyWindowFrame .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleText",
			":where(.classicyWindow).active .classicyWindowTitleBar .classicyWindowTitle .classicyWindowTitleText",
		)]: FRAME,
		[tieKey(
			".classicyButtonToolbarSizeMedium .classicyBevelButton.classicyBevelButtonSquare",
			".classicyControlStrip .classicyBevelButton.classicyControlStripModule",
		)]: STRIP_IN_TOOLBAR,
		[tieKey(
			".classicyButtonToolbarSizeSmall .classicyBevelButton.classicyBevelButtonSquare",
			".classicyControlStrip .classicyBevelButton.classicyControlStripModule",
		)]: STRIP_IN_TOOLBAR,
		[tieKey(
			".classicyBevelButton.classicyHelpButton",
			".classicyButtonToolbarSizeMedium .classicyBevelButton",
		)]: HELP_IN_TOOLBAR,
		[tieKey(
			".classicyBevelButton.classicyHelpButton",
			".classicyButtonToolbarSizeSmall .classicyBevelButton",
		)]: HELP_IN_TOOLBAR,
		[tieKey(
			".classicyBevelButton.classicyBevelButtonSquare",
			".classicyBevelButton.classicyHelpButton",
		)]: HELP_SQUARE,
		[tieKey(
			".classicyButtonToolbar .classicyBevelButton.classicyBevelButtonSquare",
			".classicyControlStrip .classicyBevelButton.classicyControlStripModule",
		)]: STRIP_IN_TOOLBAR,
		[tieKey(
			".classicyWindow .classicyWindowTitleBarModal",
			".classicyWindowFrame > .classicyWindowTitleBar",
		)]: FRAME,
	};

	// Which classes can sit on one element, read from the components' JSX
	// (classicyClassCooccurrence.ts), so it follows them as they change.
	let meet: ((a: string, b: string) => boolean) | undefined;
	const canMeet = (a: string[], b: string[]) => {
		meet ??= classicyClassesMeet(
			classicyClassSets(CLASSICY_COMPONENT, classicyStylesheetClasses()),
		);
		const m = meet;
		return a.some((x) => b.some((y) => m(x, y)));
	};

	/**
	 * Every pair of rules from two stylesheets that set one property of one
	 * element (their subjects share a class, or name classes that can sit on
	 * one element: `.classicyHelpButton` and `.classicyBevelButton`) to
	 * different values at the same specificity.
	 */
	const crossFileTies = (): Set<string> => {
		const ties = new Set<string>();
		for (const list of declarationsByTarget().values())
			for (const a of list)
				for (const b of list)
					if (
						a.file < b.file &&
						a.value !== b.value &&
						compareClassicySpecificity(a.specificity, b.specificity) === 0 &&
						canMeet(a.classes, b.classes)
					)
						ties.add(tieKey(a.selector, b.selector));
		return ties;
	};

	it(
		"every cross-file pair that styles one element differently differs in specificity",
		() => {
			const ties = crossFileTies();
			expect(
				[...ties].filter((t) => !(t in TIES_THAT_NEVER_MEET)).sort(),
			).toEqual([]);
			// Every listed tie still exists: a stale entry would hide a new one.
			expect(
				Object.keys(TIES_THAT_NEVER_MEET).filter((t) => !ties.has(t)),
			).toEqual([]);
		},
		SCAN_TIMEOUT_MS,
	);

	const W = "src/SystemFolder/SystemResources/";
	// The known cross-file overrides, each winning by specificity:
	// [override, its sheet, overridden rule, its sheet, property].
	const KNOWN_OVERRIDES: [string, string, string, string, string][] = [
		[
			".classicyWindow:has(.classicyAlertMovable) .classicyWindowTitleBar",
			`${W}Alert/ClassicyAlert.scss`,
			".classicyWindowRed .classicyWindowTitleBar",
			`${W}Window/ClassicyWindow.scss`,
			"background-color",
		],
		[
			".classicyControlStrip .classicyBevelButton.classicyControlStripModule",
			`${W}ControlStrip/ClassicyControlStrip.scss`,
			".classicyBevelButton.classicyBevelButtonSquare",
			`${W}BevelButton/ClassicyBevelButton.scss`,
			"width",
		],
		[
			".classicyControlStrip .classicyBevelButton.classicyControlStripModule",
			`${W}ControlStrip/ClassicyControlStrip.scss`,
			".classicyBevelButton",
			`${W}BevelButton/ClassicyBevelButton.scss`,
			"padding",
		],
		[
			".classicyButtonToolbarSizeMedium .classicyBevelButton.classicyBevelButtonSquare",
			`${W}ButtonToolbar/ClassicyButtonToolbar.scss`,
			".classicyBevelButton.classicyBevelButtonSquare",
			`${W}BevelButton/ClassicyBevelButton.scss`,
			"width",
		],
		[
			".classicyBevelButton.classicyHelpButton",
			`${W}HelpButton/ClassicyHelpButton.scss`,
			".classicyBevelButton",
			`${W}BevelButton/ClassicyBevelButton.scss`,
			"min-width",
		],
		[
			".classicyButtonToolbar .classicyBevelButton.classicyBevelButtonSquare",
			`${W}ButtonToolbar/ClassicyButtonToolbar.scss`,
			".classicyBevelButton.classicyHelpButton",
			`${W}HelpButton/ClassicyHelpButton.scss`,
			"width",
		],
		[
			".classicyWindow.classicyWindowWithMenuBar .classicyWindowContents:not(.classicyWindowContentsWithHeader)",
			`${W}Window/ClassicyWindowMenuBar.scss`,
			".classicyWindow .classicyWindowContents",
			`${W}Window/ClassicyWindow.scss`,
			"height",
		],
		[
			".classicyWindow.classicyWindow.classicyWindowWithMenuBar .classicyWindowContentsWithHeader",
			`${W}Window/ClassicyWindowMenuBar.scss`,
			".classicyWindow.classicyWindow .classicyWindowContentsWithHeader",
			`${W}Window/ClassicyWindow.scss`,
			"height",
		],
		[
			".classicyComboBoxNoMatches.classicyPopUpMenuListItem",
			`${W}ComboBox/ClassicyComboBox.scss`,
			".classicyPopUpMenuListItem",
			`${W}PopUpMenu/ClassicyPopUpMenu.scss`,
			"color",
		],
		[
			".classicyComboBoxNoMatches.classicyPopUpMenuListItem",
			`${W}ComboBox/ClassicyComboBox.scss`,
			".classicyPopUpMenuListItem",
			`${W}PopUpMenu/ClassicyPopUpMenu.scss`,
			"cursor",
		],
		[
			".classicyMenuItem.classicyDesktopMenuTime",
			`${W}Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss`,
			".classicyMenuItem",
			`${W}Menu/ClassicyMenu.scss`,
			"margin",
		],
		// The slider's value readout also carries its labelSize class; it is
		// meant to stay the small size whatever labelSize says (bf10949e5).
		[
			".classicySliderTrackGroup > .classicySliderValue",
			`${W}Slider/ClassicySlider.scss`,
			".classicyControlLabelSizeMedium",
			`${W}ControlLabel/ClassicyControlLabel.scss`,
			"font-size",
		],
		[
			".classicySliderTrackGroup > .classicySliderValue",
			`${W}Slider/ClassicySlider.scss`,
			".classicyControlLabelSizeLarge",
			`${W}ControlLabel/ClassicyControlLabel.scss`,
			"font-size",
		],
		[
			".classicyWindowPlacardBar .classicyPlacardHolder",
			`${W}Window/ClassicyWindow.scss`,
			".classicyPlacardHolder",
			`${W}Placard/ClassicyPlacard.scss`,
			"display",
		],
		[
			".classicyDesktopMenu > .classicyMenuItemBalloonAnchor",
			`${W}Desktop/MenuBar/ClassicyDesktopMenuBar.scss`,
			".classicyMenuItemBalloonAnchor",
			`${W}Menu/ClassicyMenu.scss`,
			"width",
		],
		[
			".classicyFileBrowserViewTableContainer.classicyTableContainer",
			`${W}File/ClassicyFileBrowserViewTable.scss`,
			".classicyTableContainer",
			`${W}Table/ClassicyTable.scss`,
			"overflow",
		],
		[
			".classicyAppearanceManagerColorsGrid .classicyColorPickerSwatchWrapper",
			"src/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearanceManager.Colors.scss",
			".classicyColorPickerSwatchWrapper",
			`${W}ColorPicker/ClassicyColorPicker.scss`,
			"gap",
		],
		[
			".appleGuideWindow .classicyAssistantHeader",
			"src/SystemFolder/Extensions/AppleGuide/AppleGuide.scss",
			".classicyAssistantHeader",
			`${W}Assistant/ClassicyAssistant.scss`,
			"height",
		],
	];

	it.each(KNOWN_OVERRIDES)(
		"%s (%s) outranks %s (%s) on %s",
		(winner, winnerFile, loser, loserFile, property) => {
			const find = (file: string, selector: string) =>
				[...declarationsByTarget().values()]
					.flat()
					.find(
						(d) =>
							d.file === file &&
							d.selector === selector &&
							d.property === property,
					);
			const won = find(winnerFile, winner);
			const lost = find(loserFile, loser);
			expect(won, `${winner} declares ${property}`).toBeDefined();
			expect(lost, `${loser} declares ${property}`).toBeDefined();
			expect(
				compareClassicySpecificity(
					won?.specificity ?? [0, 0, 0],
					lost?.specificity ?? [0, 0, 0],
				),
			).toBeGreaterThan(0);
		},
		SCAN_TIMEOUT_MS,
	);
});
