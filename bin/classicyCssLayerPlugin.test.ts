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
