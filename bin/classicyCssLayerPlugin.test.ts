import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
	classicyCssLayerPlugin,
	wrapInClassicyLayer,
} from "./classicyCssLayerPlugin";

type Transform = (
	code: string,
	id: string,
) => Promise<{ code: string; map: null } | null>;

describe("classicyCssLayerPlugin", () => {
	it("wraps compiled component scss in @layer classicy.base", () =>
		expect(wrapInClassicyLayer(".classicyButton{display:flex}")).toBe(
			"@layer classicy.base {\n.classicyButton{display:flex}\n}",
		));

	it("transform wraps src scss ids and ignores css and node_modules", async () => {
		const p = classicyCssLayerPlugin();
		const t = p.transform as unknown as Transform;
		expect((await t.call({}, ".a{}", "/repo/src/X/X.scss"))?.code).toMatch(
			/^@layer classicy.base \{/,
		);
		expect(await t.call({}, ".a{}", "/repo/src/index.css")).toBeNull();
		expect(await t.call({}, ".a{}", "/repo/node_modules/x/y.scss")).toBeNull();
	});

	it("leaves raw and url imports, the example app's stylesheets and the layer order alone", async () => {
		const t = classicyCssLayerPlugin().transform as unknown as Transform;
		expect(
			await t.call({}, "export default ''", "/repo/src/X/X.scss?raw"),
		).toBeNull();
		expect(
			await t.call({}, "export default ''", "/repo/src/X/X.scss?url"),
		).toBeNull();
		expect((await t.call({}, ".a{}", "/repo/src/X/X.scss?inline"))?.code).toBe(
			wrapInClassicyLayer(".a{}"),
		);
		const exampleScss = path.resolve(
			path.dirname(fileURLToPath(import.meta.url)),
			"../example/src/Applications/Browser/Browser.scss",
		);
		expect(await t.call({}, ".browser{}", exampleScss)).toBeNull();
		expect(
			await t.call(
				{},
				"@layer classicy.base, classicy.package, classicy.user;",
				"/repo/src/X/X.scss",
			),
		).toBeNull();
	});

	it("is idempotent", () =>
		expect(wrapInClassicyLayer(wrapInClassicyLayer(".a{}"))).toBe(
			wrapInClassicyLayer(".a{}"),
		));
});
