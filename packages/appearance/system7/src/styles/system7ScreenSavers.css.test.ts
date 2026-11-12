import { readFileSync } from "node:fs";
import path from "node:path";
import { compile, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../../bin/classicyStyleInjector";

// The screen savers under System 7 (design 0017-6me, "Screen savers"; plan
// 0018-dbd §3.8): a host loading only System 7 draws the After Dark savers
// from System 7's own package stylesheet, whose styles/_screenSavers.scss
// loads their Sass partials from Platinum's source through their one index
// there (screenSavers/_platinumScreenSavers.scss), as Platinum's sheet does,
// at the package layer's root, outside the
// System 7 scope, since the overlay is a portal. A saver's `animation:`
// shorthand resets the play state to running, and the package layer beats the
// core's base-layer reduced-motion pause, so System 7's sheet ends with its
// own pause after every saver rule, as Platinum's does
// (platinumScreenSaverStyles.test.ts).

const STYLES = import.meta.dirname;
const PLATINUM_STYLES = path.resolve(STYLES, "../../../platinum/src/styles");
const css = compile(path.join(STYLES, "system7.scss"), {
	importers: [new NodePackageImporter()],
}).css;
const platinumCss = compile(path.join(PLATINUM_STYLES, "platinum.scss"), {
	importers: [new NodePackageImporter()],
}).css;

const PAUSE_RULE =
	/@media \(prefers-reduced-motion: reduce\) \{\s*#classicy-screen-saver-overlay,\s*#classicy-screen-saver-overlay \* \{\s*animation-play-state: paused;\s*\}\s*\}/;

const SAVER_ROOTS = [
	"classicySaverBouncingBall",
	"classicySaverFadeOut",
	"classicySaverFish",
	"classicySaverFlyingToasters",
	"classicySaverGlobe",
	"classicySaverHardRain",
	"classicySaverLogo",
	"classicySaverMessages",
	"classicySaverMessages2",
	"classicySaverRainstorm",
	"classicySaverSpotlight",
	"classicySaverWarp",
];

/** The stylesheets `file` loads, as paths under Platinum's src/. */
const loadedPartials = (file: string) =>
	[...readFileSync(file, "utf8").matchAll(/meta\.load-css\("([^"]+)"\)/g)].map(
		(match) =>
			path
				.relative(
					path.resolve(PLATINUM_STYLES, ".."),
					path.resolve(path.dirname(file), match[1]),
				)
				.split(path.sep)
				.join("/"),
	);

/** The saver rules: from the first saver rule or keyframes to the pause. */
const saverSection = (sheet: string) =>
	sheet.slice(
		sheet.search(/\n {2}(?:@keyframes classicySaver|\.classicySaver)/),
		sheet.search(PAUSE_RULE),
	);

describe("System 7's screen saver styles", () => {
	// One list of the partials, the index, so the two sheets cannot drift.
	it("load the savers' one index, as Platinum's sheet does, which loads every saver partial", () => {
		const INDEX = "screenSavers/platinumScreenSavers";
		expect(loadedPartials(path.join(STYLES, "_screenSavers.scss"))).toEqual([
			INDEX,
		]);
		expect(
			loadedPartials(path.join(PLATINUM_STYLES, "_screenSavers.scss")),
		).toEqual([INDEX]);
		const partials = loadedPartials(
			path.resolve(
				PLATINUM_STYLES,
				"../screenSavers/_platinumScreenSavers.scss",
			),
		);
		expect(partials).toHaveLength(SAVER_ROOTS.length);
		for (const partial of partials)
			expect(partial).toMatch(
				/^screenSavers\/([A-Za-z0-9]+)\/ClassicyScreenSaver\1$/,
			);
	});

	it("ship in System 7's package layer, at its root, outside the package scope", () => {
		expect(
			isSingleClassicyLayerBlock(css, "classicy.package", CLASSICY_LAYER_ORDER),
		).toBe(true);
		for (const root of SAVER_ROOTS)
			expect(css, root).toMatch(
				new RegExp(`\\n {2}\\.${root}(?![\\w-])[^\\n]*\\{`),
			);
		expect(css).not.toMatch(
			/data-classicy-appearance=system7\]\s+\.classicySaver/,
		);
		expect(css).toContain("@keyframes classicySaverBallMoveX");
	});

	// Equal rules in both sheets: a host loading both packages gets the same
	// saver styles twice, which is harmless.
	it("are the rules Platinum's sheet carries, byte for byte", () => {
		const rules = saverSection(css);
		for (const root of SAVER_ROOTS) expect(rules, root).toContain(`.${root}`);
		expect(rules).toBe(saverSection(platinumCss));
	});

	it("end with System 7's own reduced-motion pause, after every saver rule", () => {
		const pause = css.search(PAUSE_RULE);
		expect(pause, "the pause rule").toBeGreaterThan(-1);
		expect(css.slice(0, pause)).toContain("@layer classicy.package");
		expect(css.slice(pause)).not.toMatch(
			/data-classicy-appearance=system7\][^{]*#classicy-screen-saver-overlay/,
		);
		const shorthands = [...css.matchAll(/(^|\n)\s*animation:/g)];
		expect(shorthands.length).toBeGreaterThan(0);
		for (const hit of shorthands) expect(hit.index).toBeLessThan(pause);
		const lastSaverRule = Math.max(
			...SAVER_ROOTS.map((root) => css.lastIndexOf(`.${root}`)),
		);
		expect(lastSaverRule).toBeLessThan(pause);
		// The sheet's last rule: nothing follows it but the layer's close.
		expect(css.slice(pause).replace(PAUSE_RULE, "").trim()).toBe("}");
		// And the only place the sheet pauses animations.
		expect(css.match(/animation-play-state/g)).toHaveLength(1);
	});
});
