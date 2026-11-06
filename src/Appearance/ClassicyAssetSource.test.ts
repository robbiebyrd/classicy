import { afterEach, describe, expect, it, vi } from "vitest";
import { isClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";

describe("isClassicyAssetSource", () => {
	afterEach(() => {
		vi.unstubAllGlobals();
	});

	it("accepts relative URLs, http(s), blob: and data: URIs", () => {
		expect(isClassicyAssetSource("a.png")).toBe(true);
		expect(isClassicyAssetSource("/assets/a.png")).toBe(true);
		expect(isClassicyAssetSource("http://x.test/a.png")).toBe(true);
		expect(isClassicyAssetSource("https://x.test/a.png")).toBe(true);
		expect(
			isClassicyAssetSource(
				"blob:https://x.test/0b1c7a52-4f3e-4f39-9c0e-7b1d2a3c4d5e",
			),
		).toBe(true);
		expect(isClassicyAssetSource("data:image/svg+xml,<svg a='1'/>")).toBe(true);
	});

	it("accepts parentheses and spaces, which every emitter quotes", () => {
		expect(isClassicyAssetSource("assets/My Icons (old)/a.png")).toBe(true);
	});

	it("accepts file: when it is the library module's own protocol", () => {
		// Under vitest the module is loaded from disk, so import.meta.url is file:.
		expect(new URL(import.meta.url).protocol).toBe("file:");
		expect(
			isClassicyAssetSource(
				"file:///C:/Program%20Files%20(x86)/App/resources/assets/geneva.woff2",
			),
		).toBe(true);
	});

	it("accepts chrome-extension: when it is the page's protocol", () => {
		vi.stubGlobal("location", { protocol: "chrome-extension:" });
		expect(
			isClassicyAssetSource("chrome-extension://abcdef/assets/apple.svg"),
		).toBe(true);
	});

	it("refuses a scheme that is neither the module's nor the page's", () => {
		vi.stubGlobal("location", { protocol: "http:" });
		expect(
			isClassicyAssetSource("chrome-extension://abcdef/assets/apple.svg"),
		).toBe(false);
		expect(isClassicyAssetSource("ftp://x.test/a.png")).toBe(false);
	});

	it("refuses javascript: and vbscript:, in any case and after trimming", () => {
		expect(isClassicyAssetSource("javascript:alert(1)")).toBe(false);
		expect(isClassicyAssetSource("  JavaScript:alert(1)")).toBe(false);
		expect(isClassicyAssetSource("VBScript:msgbox(1)")).toBe(false);
	});

	it("refuses javascript: even when it is the page's protocol", () => {
		vi.stubGlobal("location", { protocol: "javascript:" });
		expect(isClassicyAssetSource("javascript:alert(1)")).toBe(false);
	});

	it.each([
		['https://x.test/a".png', "quote"],
		["a\\b.png", "backslash"],
		["a\rb.png", "carriage return"],
		["a\nb.png", "line feed"],
		['data:image/svg+xml,<svg a="1"/>', "quote in a data: URI"],
		["", "empty string"],
	])("refuses %j (%s)", (bad) => {
		expect(isClassicyAssetSource(bad)).toBe(false);
	});
});
