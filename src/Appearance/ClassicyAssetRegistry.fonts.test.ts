import { beforeEach, describe, expect, it } from "vitest";
import {
	registerClassicyFonts,
	resetClassicyAssets,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";

const styleCss = (packageId: string): string =>
	document.getElementById(`classicy-fonts-${packageId}`)?.textContent ?? "";

describe("registerClassicyFonts", () => {
	beforeEach(() => {
		resetClassicyAssets();
		document.head.innerHTML = "";
	});

	it("writes one @font-face per face into <style id=classicy-fonts-<packageId>>", () => {
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "geneva.woff2" },
			{ family: "Geneva", src: "geneva-b.woff2", weight: "bold" },
		]);
		const css = document.getElementById("classicy-fonts-platinum")
			?.textContent as string;
		expect(css.match(/@font-face/g)).toHaveLength(2);
		expect(css).toContain(
			'font-family:"Geneva";src:url("geneva-b.woff2") format("woff2");font-weight:bold;font-style:normal;font-display:swap',
		);
	});

	it("re-registering replaces the style element's content, not duplicates it", () => {
		const faces = [
			{ family: "Geneva", src: "geneva.woff2" },
			{ family: "Geneva", src: "geneva-b.woff2", weight: "bold" },
		];
		registerClassicyFonts("platinum", faces);
		registerClassicyFonts("platinum", faces);
		expect(document.querySelectorAll("#classicy-fonts-platinum")).toHaveLength(
			1,
		);
		expect(styleCss("platinum").match(/@font-face/g)).toHaveLength(2);
	});

	it("places the element after #classicy-styles when present", () => {
		const styles = document.createElement("style");
		styles.id = "classicy-styles";
		document.head.prepend(styles);
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "geneva.woff2" },
		]);
		expect(styles.nextElementSibling?.id).toBe("classicy-fonts-platinum");
	});

	it("places the element at the head's start when #classicy-styles is absent", () => {
		document.head.append(document.createElement("meta"));
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "geneva.woff2" },
		]);
		expect(document.head.firstElementChild?.id).toBe("classicy-fonts-platinum");
	});

	it("keys the fonts tree by family and weight-style", () => {
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "geneva.woff2" },
			{ family: "Geneva", src: "geneva-b.woff2", weight: "bold" },
		]);
		expect(resolveClassicyAsset("fonts", "Geneva.bold-normal")).toBe(
			"geneva-b.woff2",
		);
		expect(resolveClassicyAsset("fonts", "Geneva.normal-normal")).toBe(
			"geneva.woff2",
		);
	});

	it("derives format from a data: mime", () => {
		registerClassicyFonts("platinum", [
			{ family: "Inline", src: "data:font/woff;base64,AAAA" },
		]);
		expect(styleCss("platinum")).toContain('format("woff")');
	});

	it("derives format from the extension and omits it when unknown", () => {
		registerClassicyFonts("platinum", [
			{ family: "A", src: "a.ttf" },
			{ family: "B", src: "b.otf" },
			{ family: "C", src: "/assets/c.woff2?v=1" },
			{ family: "D", src: "/assets/d" },
		]);
		const css = styleCss("platinum");
		expect(css).toContain('url("a.ttf") format("truetype")');
		expect(css).toContain('url("b.otf") format("opentype")');
		expect(css).toContain('url("/assets/c.woff2?v=1") format("woff2")');
		expect(css).toContain('url("/assets/d");font-weight');
	});

	it("takes an array of sources as ordered fallbacks", () => {
		registerClassicyFonts("platinum", [
			{ family: "Fallback", src: ["f.woff2", "f.woff"] },
		]);
		expect(styleCss("platinum")).toContain(
			'src:url("f.woff2") format("woff2"),url("f.woff") format("woff");font-weight',
		);
		expect(resolveClassicyAsset("fonts", "Fallback.normal-normal")).toBe(
			"f.woff2",
		);
	});

	it("keeps each package's faces in its own style element", () => {
		registerClassicyFonts("platinum", [{ family: "A", src: "a.woff2" }]);
		registerClassicyFonts("host", [{ family: "B", src: "b.woff2" }]);
		expect(styleCss("platinum")).toContain("a.woff2");
		expect(styleCss("platinum")).not.toContain("b.woff2");
		expect(styleCss("host")).toContain("b.woff2");
	});

	it("skips a face whose family or source could break out of the stylesheet", () => {
		registerClassicyFonts("platinum", [
			{ family: 'Bad"}body{x:y', src: "a.woff2" },
			{ family: "Good", src: 'a.woff2"){}' },
			{ family: "Fine", src: "fine.woff2" },
		]);
		const css = styleCss("platinum");
		expect(css.match(/@font-face/g)).toHaveLength(1);
		expect(css).toContain("fine.woff2");
		expect(resolveClassicyAsset("fonts", "Good.normal-normal")).toBeUndefined();
	});
});
