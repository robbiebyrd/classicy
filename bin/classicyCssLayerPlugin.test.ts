import path from "node:path";
import { fileURLToPath } from "node:url";
import type { HtmlTagDescriptor } from "vite";
import { describe, expect, it } from "vitest";
import {
	classicyCssLayerPlugin,
	wrapInClassicyLayer,
} from "./classicyCssLayerPlugin";
import { CLASSICY_LAYER_ORDER } from "./classicyStyleInjector";

type Transform = (
	code: string,
	id: string,
) => Promise<{
	code: string;
	map: { version: number; sources: string[]; mappings: string } | null;
} | null>;

// The plugin only wraps stylesheets under this repository's own src/.
const ROOT = path
	.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
	.replace(/\\/g, "/");
// The plugin as Vite runs it: configResolved first, with the command.
const transform = (command: "serve" | "build" = "serve") => {
	const p = classicyCssLayerPlugin();
	(p.configResolved as unknown as (c: { command: string }) => void)({
		command,
	});
	return p.transform as unknown as Transform;
};
// What the dev server emits for a component stylesheet: the layer order (so a
// page with no HTML entry still gets it first), then the wrapped CSS.
const layered = (css: string) =>
	`${CLASSICY_LAYER_ORDER}\n${wrapInClassicyLayer(css)}`;

describe("classicyCssLayerPlugin", () => {
	it("wraps compiled component scss in @layer classicy.base", () =>
		expect(wrapInClassicyLayer(".classicyButton{display:flex}")).toBe(
			"@layer classicy.base {\n.classicyButton{display:flex}\n}",
		));

	it("transform wraps src scss ids and ignores css and node_modules", async () => {
		const t = transform();
		expect((await t.call({}, ".a{}", `${ROOT}/src/X/X.scss`))?.code).toBe(
			layered(".a{}"),
		);
		expect(await t.call({}, ".a{}", `${ROOT}/src/index.css`)).toBeNull();
		expect(
			await t.call({}, ".a{}", `${ROOT}/node_modules/x/src/y.scss`),
		).toBeNull();
	});

	it("wraps only this repository's src, not another src directory", async () => {
		const t = transform();
		expect(
			await t.call(
				{},
				".browser{}",
				`${ROOT}/example/src/Applications/Browser/Browser.scss`,
			),
		).toBeNull();
		expect(await t.call({}, ".a{}", "/elsewhere/src/X/X.scss")).toBeNull();
	});

	it("leaves raw and url imports alone and wraps inline ones", async () => {
		const t = transform();
		expect(
			await t.call({}, "export default ''", `${ROOT}/src/X/X.scss?raw`),
		).toBeNull();
		expect(
			await t.call({}, "export default ''", `${ROOT}/src/X/X.scss?url`),
		).toBeNull();
		expect(
			(await t.call({}, ".a{}", `${ROOT}/src/X/X.scss?inline`))?.code,
		).toBe(layered(".a{}"));
	});

	it("is idempotent", () =>
		expect(wrapInClassicyLayer(wrapInClassicyLayer(".a{}"))).toBe(
			wrapInClassicyLayer(".a{}"),
		));

	it("leaves its own output alone", async () => {
		expect(wrapInClassicyLayer(layered(".a{}"))).toBe(layered(".a{}"));
		expect(
			await transform().call({}, layered(".a{}"), `${ROOT}/src/X/X.scss`),
		).toBeNull();
	});

	it("wraps CSS that only looks like its wrapper", () => {
		for (const css of [
			"@layer classicy.base.x {\n.a{}\n}",
			"@layer classicy.basement {\n.a{}\n}",
		])
			expect(wrapInClassicyLayer(css)).toBe(
				`@layer classicy.base {\n${css}\n}`,
			);
	});

	// An Appearance Package's stylesheet (`platinum.scss?inline`) compiles to
	// its own `@layer classicy.package { … }` block. Wrapped again it would
	// land in `classicy.base.classicy.package`, under every base rule.
	const PACKAGE_CSS =
		'@layer classicy.package {\n  .classicyDesktop[data-classicy-appearance="platinum"] .classicyButton {\n    color: red;\n  }\n}';
	const PACKAGE_ID = `${ROOT}/src/Appearance/Platinum/styles/platinum.scss?inline`;

	it("leaves a stylesheet that is exactly one classicy.package block alone", async () => {
		expect(wrapInClassicyLayer(PACKAGE_CSS)).toBe(PACKAGE_CSS);
		for (const command of ["serve", "build"] as const)
			expect(
				await transform(command).call({}, PACKAGE_CSS, PACKAGE_ID),
			).toBeNull();
		// After a hoisted @charset, or a trailing newline, it is still one block.
		const charset = `@charset "UTF-8";\n${PACKAGE_CSS}\n`;
		expect(await transform().call({}, charset, PACKAGE_ID)).toBeNull();
		// A brace inside a string or a comment does not close the block.
		const braces = PACKAGE_CSS.replace(
			"color: red;",
			'content: "}"; /* } */ color: red;',
		);
		expect(await transform().call({}, braces, PACKAGE_ID)).toBeNull();
		// Top-level comments around the block (Sass keeps them) are not rules.
		const comments = `/* Platinum */\n${PACKAGE_CSS}\n/* end */`;
		expect(await transform().call({}, comments, PACKAGE_ID)).toBeNull();
	});

	it("leaves a classicy.user block alone too, but still wraps component inline sheets", async () => {
		const user = "@layer classicy.user {\n.a{}\n}";
		expect(await transform().call({}, user, PACKAGE_ID)).toBeNull();
		expect(
			(await transform().call({}, ".a{}", `${ROOT}/src/X/X.scss?inline`))?.code,
		).toBe(layered(".a{}"));
	});

	it("wraps package-looking CSS that is not exactly one declared-layer block", async () => {
		for (const css of [
			// A rule after the block.
			`${PACKAGE_CSS}\n.b{}`,
			// Two blocks.
			`${PACKAGE_CSS}\n${PACKAGE_CSS}`,
			// A rule before the block.
			`.b{}\n${PACKAGE_CSS}`,
			// Undeclared names that only share a prefix.
			"@layer classicy.package.x {\n.a{}\n}",
			"@layer classicy.packages {\n.a{}\n}",
			"@layer classicy.base.host {\n.a{}\n}",
			// Unbalanced.
			"@layer classicy.package {\n.a{\n}",
			// A statement that is not the layer order.
			`@layer x;\n${PACKAGE_CSS}`,
		]) {
			expect(wrapInClassicyLayer(css)).toBe(
				`@layer classicy.base {\n${css}\n}`,
			);
			expect((await transform().call({}, css, PACKAGE_ID))?.code).toBe(
				layered(css),
			);
		}
	});

	// Platinum's stylesheet before any component partial is included (task
	// 4.1): Sass keeps the empty block, which only names the layer.
	it("leaves an empty package stylesheet alone", async () => {
		const empty = "@layer classicy.package {}";
		expect(wrapInClassicyLayer(empty)).toBe(empty);
		for (const command of ["serve", "build"] as const)
			expect(await transform(command).call({}, empty, PACKAGE_ID)).toBeNull();
	});

	it("never wraps a blank stylesheet into an empty classicy.base block", async () => {
		for (const css of ["", "\n", "  \n\t"]) {
			expect(wrapInClassicyLayer(css)).toBe(css);
			for (const command of ["serve", "build"] as const) {
				expect(await transform(command).call({}, css, PACKAGE_ID)).toBeNull();
				expect(
					await transform(command).call({}, css, `${ROOT}/src/X/X.scss`),
				).toBeNull();
			}
		}
	});

	it("prepends the layer order to each file only when serving", async () => {
		const id = `${ROOT}/src/X/X.scss`;
		expect((await transform("serve").call({}, ".a{}", id))?.code).toBe(
			layered(".a{}"),
		);
		// A build declares the order once, first: the injector,
		// prependLayerOrder for dist/classicy.css, the HTML tag for pages.
		expect((await transform("build").call({}, ".a{}", id))?.code).toBe(
			wrapInClassicyLayer(".a{}"),
		);
	});

	it("declares the layer order first in every HTML page it serves", () => {
		const hook = classicyCssLayerPlugin().transformIndexHtml as unknown as (
			html: string,
		) => HtmlTagDescriptor[];
		expect(hook("<html></html>")).toEqual([
			{
				tag: "style",
				attrs: { id: "classicy-layer-order" },
				children: CLASSICY_LAYER_ORDER,
				injectTo: "head-prepend",
			},
		]);
	});
});

const BASE64 =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
/** Every segment of a v3 `mappings` string as [genLine, genCol, srcLine, srcCol]. */
const decodeMappings = (mappings: string): number[][] => {
	const out: number[][] = [];
	let srcLine = 0;
	let srcCol = 0;
	mappings.split(";").forEach((line, genLine) => {
		let genCol = 0;
		for (const segment of line.split(",").filter(Boolean)) {
			const fields: number[] = [];
			let value = 0;
			let shift = 0;
			for (const ch of segment) {
				const digit = BASE64.indexOf(ch);
				value += (digit & 31) << shift;
				if (digit & 32) shift += 5;
				else {
					fields.push(value & 1 ? -(value >> 1) : value >> 1);
					value = 0;
					shift = 0;
				}
			}
			genCol += fields[0];
			srcLine += fields[2];
			srcCol += fields[3];
			out.push([genLine, genCol, srcLine, srcCol]);
		}
	});
	return out;
};

describe("classicyCssLayerPlugin source maps", () => {
	const css = ".a {\n  color: red;\n}\n.bb { margin: 0 }";
	const id = `${ROOT}/src/X/X.scss`;

	it.each([
		"serve",
		"build",
	] as const)("maps every input character back to itself (%s)", async (command) => {
		const result = await transform(command).call({}, css, id);
		const map = result?.map;
		expect(map).not.toBeNull();
		expect(map?.version).toBe(3);
		expect(map?.sources).toEqual([id]);
		const segments = decodeMappings(map?.mappings ?? "");
		// The wrapper adds whole lines before the input: one when building,
		// two (the order statement too) when serving.
		const shift = command === "serve" ? 2 : 1;
		const inputLines = css.split("\n");
		const expected = inputLines.flatMap((text, line) =>
			[...text].map((_, col) => [line + shift, col, line, col]),
		);
		expect(segments).toEqual(expected);
		// And the generated text at each mapped spot is that input character.
		const outLines = (result?.code ?? "").split("\n");
		for (const [gl, gc, sl, sc] of segments)
			expect(outLines[gl][gc]).toBe(inputLines[sl][sc]);
	});
});
