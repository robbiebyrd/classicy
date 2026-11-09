import { readFileSync } from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { compile, compileString, NodePackageImporter } from "sass";
import { describe, expect, it } from "vitest";
import { isSingleClassicyLayerBlock } from "../../../../../bin/classicyPackageCss";
import { CLASSICY_LAYER_ORDER } from "../../../../../bin/classicyStyleInjector";

// The savers' styles ship in Platinum's one package stylesheet (plan 0016-vbq
// §2.1, design "Saver styles live in Platinum's one package stylesheet"):
// inside its `@layer classicy.package` block but outside the package scope,
// keyed on the savers' own classes and `classicySaver*` keyframes, so a saver
// another package also names renders the same there. In the package layer
// they beat every `classicy.base` rule, the overlay's included, so none may
// set what the overlay owns: the hidden pointer (`cursor`) and the
// `animation-play-state` longhand. An `animation:` shorthand resets the play
// state to running, so the core's base-layer reduced-motion pause cannot
// reach these savers; the package layer carries its own copy of that pause
// after every saver rule (the mixin's last rule), pinned below.

const PLATINUM_SRC = path.resolve(import.meta.dirname, "..");
const CORE_SRC = path.resolve(import.meta.dirname, "../../../../../src");
const LOAD = {
	loadPaths: [CORE_SRC, PLATINUM_SRC],
	importers: [new NodePackageImporter()],
};

// The reduced-motion pause the mixin ends with (see the header comment).
const PAUSE_RULE =
	/@media \(prefers-reduced-motion: reduce\) \{\s*#classicy-screen-saver-overlay,\s*#classicy-screen-saver-overlay \* \{\s*animation-play-state: paused;\s*\}\s*\}/;

const platinumCss = compile(
	path.join(PLATINUM_SRC, "styles", "platinum.scss"),
	LOAD,
).css;
// The savers' partial alone, its mixin included at the root of a sheet in
// styles/, as platinum.scss includes it (meta.load-css resolves the saver
// sheets from there).
const saverCssWithPause = compileString(
	'@use "screenSavers";\n@include screenSavers.screenSavers;',
	{
		...LOAD,
		url: pathToFileURL(path.join(PLATINUM_SRC, "styles", "test.scss")),
	},
).css;
// The savers' own rules, without the trailing pause rule.
const saverCss = saverCssWithPause.replace(PAUSE_RULE, "");

/** Each rule's selector (or at-rule header) and its declarations, flattened. */
const declarations = (css: string): { header: string; body: string }[] => {
	const out: { header: string; body: string }[] = [];
	const stack: string[] = [];
	let body = "";
	for (const raw of css.split("\n")) {
		const line = raw.trim();
		if (line.endsWith("{")) {
			stack.push(line.slice(0, -1).trim());
			body = "";
		} else if (line === "}") {
			if (body) out.push({ header: stack.join(" > "), body });
			body = "";
			stack.pop();
		} else body += `${line}\n`;
	}
	return out;
};

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

describe("the screen savers' styles (styles/_screenSavers.scss)", () => {
	it("style every saver's root, keyed on its own class", () => {
		for (const root of SAVER_ROOTS)
			expect(saverCss, root).toMatch(new RegExp(`\\.${root}(?![\\w-])`));
		// Nothing but the savers: every selector names a saver class, every
		// keyframes block is a saver's.
		for (const { header } of declarations(saverCss)) {
			const top = header.split(" > ")[0];
			if (top.startsWith("@keyframes"))
				expect(top).toMatch(/^@keyframes classicySaver/);
			else expect(top, header).toMatch(/\.classicySaver/);
		}
	});

	// Moved from the core's ClassicyCascade.repo.test.ts with the saver.
	it("bouncing balls keep their per-ball timing in the stylesheet", () => {
		const rules = declarations(saverCss);
		for (let i = 0; i < 12; i++) {
			const selector = `.classicySaverBouncingBallBall:nth-child(${i + 1})`;
			const body = rules.find(({ header }) => header === selector)?.body;
			const animation = body?.match(/(?:^|\n)animation:([^;]*);/)?.[1];
			const seconds = animation?.match(/-?[\d.]+s/g)?.map(Number.parseFloat);
			// The timing the component used to write inline, ball by ball.
			expect(seconds, selector).toEqual([
				Number((3.4 + i * 0.55).toFixed(2)),
				-Number((i * 0.9).toFixed(2)) || 0,
				Number((3 + i * 0.42).toFixed(2)),
				-Number((i * 1.3).toFixed(2)) || 0,
			]);
		}
	});

	it("no saver style sets animation-play-state or cursor", () => {
		const offenders = declarations(saverCss).filter(({ body }) =>
			// The longhands, and the `animation` shorthand's play-state keyword.
			/(^|\n)(animation-play-state|cursor)\s*:|(^|\n)animation\s*:[^;]*\b(paused|running)\b/.test(
				body,
			),
		);
		expect(offenders).toEqual([]);
	});

	// A saver's `animation:` shorthand resets animation-play-state to running,
	// and the package layer beats the core's base-layer pause, so the package
	// layer repeats the pause, last, unscoped.
	it("end with the package layer's own reduced-motion pause, after every saver rule", () => {
		const pause = platinumCss.search(PAUSE_RULE);
		expect(pause, "the pause rule").toBeGreaterThan(-1);
		// Unscoped, in the package layer's block.
		expect(platinumCss.slice(0, pause)).toContain("@layer classicy.package");
		expect(platinumCss.slice(pause)).not.toMatch(
			/data-classicy-appearance=platinum\][^{]*#classicy-screen-saver-overlay/,
		);
		// Every saver rule that sets an `animation:` shorthand comes before it.
		const shorthands = [...platinumCss.matchAll(/(^|\n)\s*animation:/g)];
		expect(shorthands.length).toBeGreaterThan(0);
		for (const hit of shorthands) expect(hit.index).toBeLessThan(pause);
		const lastSaverRule = Math.max(
			...SAVER_ROOTS.map((root) => platinumCss.lastIndexOf(`.${root}`)),
		);
		expect(lastSaverRule).toBeLessThan(pause);
		// And it is the only place the package layer pauses animations.
		expect(platinumCss.match(/animation-play-state/g)).toHaveLength(1);
	});

	it("ship in Platinum's package layer, outside the package scope", () => {
		expect(
			isSingleClassicyLayerBlock(
				platinumCss,
				"classicy.package",
				CLASSICY_LAYER_ORDER,
			),
		).toBe(true);
		// Unscoped: the saver rules sit straight in the layer block.
		for (const root of SAVER_ROOTS)
			expect(platinumCss, root).toMatch(
				new RegExp(`\\n {2}\\.${root}(?![\\w-])[^\\n]*\\{`),
			);
		expect(platinumCss).not.toMatch(
			/data-classicy-appearance=platinum\]\s+\.classicySaver/,
		);
		expect(platinumCss).toContain("@keyframes classicySaverBallMoveX");
	});

	// The overlay keeps the pause and the hidden pointer (ClassicyScreenSaver
	// .scss, in the core's base layer); the savers left the core's stylesheet.
	it("leave the overlay's own rules, and only those, in the core", () => {
		const overlay = readFileSync(
			path.join(
				CORE_SRC,
				"SystemFolder/Extensions/ScreenSaver/ClassicyScreenSaver.scss",
			),
			"utf8",
		);
		expect(overlay).toMatch(/animation-play-state:\s*paused/);
		expect(overlay).toMatch(/cursor:\s*none/);
		expect(overlay).not.toMatch(/\.classicySaver[A-Z]/);
	});
});
