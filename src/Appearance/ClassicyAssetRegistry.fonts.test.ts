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

	it("places the element after #classicy-layer-order when #classicy-styles is absent (dev)", () => {
		const order = document.createElement("style");
		order.id = "classicy-layer-order";
		document.head.append(order, document.createElement("meta"));
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "geneva.woff2" },
		]);
		expect(document.head.firstElementChild).toBe(order);
		expect(order.nextElementSibling?.id).toBe("classicy-fonts-platinum");
	});

	it("still places the element after #classicy-styles when both are present", () => {
		const order = document.createElement("style");
		order.id = "classicy-layer-order";
		const styles = document.createElement("style");
		styles.id = "classicy-styles";
		document.head.append(order, styles);
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "geneva.woff2" },
		]);
		expect(styles.nextElementSibling?.id).toBe("classicy-fonts-platinum");
	});

	it("places the element at the head's start when neither is present", () => {
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

	it("skips a face whose family contains a control character", () => {
		registerClassicyFonts("platinum", [
			{ family: "Form\fFeed", src: "a.woff2" },
			{ family: "Fine", src: "fine.woff2" },
		]);
		const css = styleCss("platinum");
		expect(css.match(/@font-face/g)).toHaveLength(1);
		expect(css).not.toContain("\f");
		expect(
			resolveClassicyAsset("fonts", "Form\fFeed.normal-normal"),
		).toBeUndefined();
	});
});

// Story 0210-aal: System 7 ships byte-identical copies of Platinum's faces,
// so a host loading both would write each shared face twice. A face that
// names its `file` is shared by family, weight, style and file: the first
// package to register it writes its rule, the others none.
describe("registerClassicyFonts with shared files", () => {
	beforeEach(() => {
		resetClassicyAssets();
		document.head.innerHTML = "";
	});

	const rules = (packageId: string): string[] =>
		styleCss(packageId).match(/@font-face\{[^}]*\}/g) ?? [];

	it("writes a face two packages share once, in the first package's element", () => {
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "p/geneva.woff2", file: "Geneva-normal-normal" },
			{ family: "Charcoal", src: "p/charcoal.woff2", file: "Charcoal" },
		]);
		registerClassicyFonts("system7", [
			{ family: "Geneva", src: "s/geneva.woff2", file: "Geneva-normal-normal" },
		]);
		expect(rules("platinum")).toHaveLength(2);
		expect(styleCss("platinum")).toContain("p/geneva.woff2");
		expect(rules("system7")).toEqual([]);
		// Each package's asset tree still names its own file.
		expect(
			resolveClassicyAsset("fonts", "Geneva.normal-normal", "system7"),
		).toBe("s/geneva.woff2");
	});

	it("whichever package registers first writes it", () => {
		registerClassicyFonts("system7", [
			{ family: "Geneva", src: "s/geneva.woff2", file: "Geneva-normal-normal" },
		]);
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "p/geneva.woff2", file: "Geneva-normal-normal" },
			{ family: "Charcoal", src: "p/charcoal.woff2", file: "Charcoal" },
		]);
		expect(rules("system7")).toHaveLength(1);
		expect(styleCss("system7")).toContain("s/geneva.woff2");
		expect(rules("platinum")).toHaveLength(1);
		expect(styleCss("platinum")).toContain("p/charcoal.woff2");
	});

	it("shares only the same family, weight, style and file", () => {
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "p/g.woff2", file: "Geneva" },
			{
				family: "Geneva",
				src: "p/gb.woff2",
				file: "Geneva-bold",
				weight: "bold",
			},
		]);
		registerClassicyFonts("other", [
			// Another file of the same face: its own rule.
			{ family: "Geneva", src: "o/g.woff2", file: "Geneva-other" },
			// The same file under another style: its own rule.
			{
				family: "Geneva",
				src: "o/gb.woff2",
				file: "Geneva-bold",
				weight: "bold",
				style: "italic",
			},
			// No file: never shared.
			{ family: "Geneva", src: "o/gbn.woff2", weight: "bold" },
		]);
		expect(rules("platinum")).toHaveLength(2);
		expect(rules("other")).toHaveLength(3);
	});

	it("a face named by another family is not shared", () => {
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "p/g.woff2", file: "Shared" },
		]);
		registerClassicyFonts("other", [
			{ family: "Monaco", src: "o/m.woff2", file: "Shared" },
		]);
		expect(rules("other")).toHaveLength(1);
	});

	it("hands a face back when its first package registers another file for it", () => {
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "p/g.woff2", file: "Geneva" },
		]);
		registerClassicyFonts("system7", [
			{ family: "Geneva", src: "s/g.woff2", file: "Geneva" },
		]);
		expect(rules("system7")).toEqual([]);
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "p/g2.woff2", file: "Geneva-2" },
		]);
		expect(rules("platinum")).toHaveLength(1);
		expect(styleCss("platinum")).toContain("p/g2.woff2");
		expect(rules("system7")).toHaveLength(1);
		expect(styleCss("system7")).toContain("s/g.woff2");
	});

	it("writes no element for a package whose every face an earlier package writes", () => {
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "p/g.woff2", file: "Geneva" },
		]);
		registerClassicyFonts("system7", [
			{ family: "Geneva", src: "s/g.woff2", file: "Geneva" },
		]);
		expect(document.getElementById("classicy-fonts-system7")).toBeNull();
		expect(document.querySelectorAll("style")).toHaveLength(1);
	});

	it("removes a package's element once an earlier package takes its last face over", () => {
		registerClassicyFonts("platinum", [
			{ family: "Charcoal", src: "p/c.woff2", file: "Charcoal" },
		]);
		registerClassicyFonts("system7", [
			{ family: "Geneva", src: "s/g.woff2", file: "Geneva" },
		]);
		expect(rules("system7")).toHaveLength(1);
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "p/g.woff2", file: "Geneva" },
		]);
		expect(document.getElementById("classicy-fonts-system7")).toBeNull();
		// Handed back, the element is written again.
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "p/g2.woff2", file: "Geneva-2" },
		]);
		expect(rules("system7")).toHaveLength(1);
	});

	it("ignores a file that is not a non-empty string, keeping the face unshared", () => {
		registerClassicyFonts("platinum", [
			{ family: "Geneva", src: "p/g.woff2", file: "" },
		]);
		registerClassicyFonts("other", [
			{ family: "Geneva", src: "o/g.woff2", file: "" },
			{ family: "Monaco", src: "o/m.woff2", file: 7 as never },
		]);
		expect(rules("platinum")).toHaveLength(1);
		expect(rules("other")).toHaveLength(2);
	});
});
