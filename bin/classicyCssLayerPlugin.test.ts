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
) => Promise<{ code: string; map: null } | null>;

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
