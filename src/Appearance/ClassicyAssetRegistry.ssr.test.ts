// @vitest-environment node
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, it } from "vitest";
import {
	registerClassicyAssets,
	registerClassicySystemArt,
	resetClassicyAssets,
	useClassicyAsset,
	useClassicyAssetTree,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";

describe("asset registry hooks under server rendering", () => {
	beforeEach(() => {
		resetClassicyAssets();
		registerClassicySystemArt("platinum", { appleMenu: "apple.png" });
		registerClassicyAssets("icons", "platinum", { system: { alias: "a.png" } });
	});

	it("useClassicyAsset renders the registered source", () => {
		const Probe = () =>
			createElement("span", null, useClassicyAsset("systemArt", "appleMenu"));
		expect(renderToString(createElement(Probe))).toBe("<span>apple.png</span>");
	});

	it("useClassicyAssetTree renders the merged tree", () => {
		const Probe = () =>
			createElement(
				"span",
				null,
				JSON.stringify(useClassicyAssetTree("icons")),
			);
		expect(renderToString(createElement(Probe))).toBe(
			"<span>{&quot;system&quot;:{&quot;alias&quot;:&quot;a.png&quot;}}</span>",
		);
	});

	it("useClassicyAssetVars renders the url() variables", () => {
		const Probe = () => createElement("div", { style: useClassicyAssetVars() });
		expect(renderToString(createElement(Probe))).toBe(
			'<div style="--classicy-art-apple-menu:url(&quot;apple.png&quot;)"></div>',
		);
	});
});
