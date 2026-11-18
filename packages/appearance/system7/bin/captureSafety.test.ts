import { describe, expect, it } from "vitest";
import { captureFileName, refusedCaptureRequest } from "./captureSafety.mjs";

// capture-references.mjs writes each capture to `<out>/<name>.png` and, in
// `serve` mode, plays any steps POSTed to it: a name may not leave `<out>`,
// and a web page in the developer's browser may not drive it (final review
// M2).
describe("captureFileName", () => {
	it.each(["256-755-desktop", "bw_menu.2", "a"])("keeps %s", (name) =>
		expect(captureFileName(name)).toBe(`${name}.png`));

	it.each([
		"../escape",
		"a/b",
		"a\\b",
		"/etc/x",
		"",
		"sp ace",
		"nul\u0000",
		"%2e%2e",
	])("refuses %j", (name) =>
		expect(() => captureFileName(name)).toThrow(
			/capture name .*: letters, digits, _, \. and - only/,
		));

	it("refuses a name that is not a string", () =>
		expect(() => captureFileName(["x"])).toThrow(/capture name/));
});

describe("refusedCaptureRequest", () => {
	it("passes a request a script sends (curl, node), with neither header", () =>
		expect(refusedCaptureRequest({ host: "127.0.0.1:6681" })).toBeNull());

	it("passes a URL the developer typed (Sec-Fetch-Site: none)", () =>
		expect(refusedCaptureRequest({ "sec-fetch-site": "none" })).toBeNull());

	it("refuses a request carrying an Origin header", () =>
		expect(refusedCaptureRequest({ origin: "https://example.com" })).toMatch(
			/Origin/,
		));

	it("refuses a page's own request even with an empty or null Origin", () => {
		expect(refusedCaptureRequest({ origin: "" })).toMatch(/Origin/);
		expect(refusedCaptureRequest({ origin: "null" })).toMatch(/Origin/);
	});

	// An <img> or a no-cors GET sends no Origin, but the browser marks it.
	it.each([
		"cross-site",
		"same-site",
		"same-origin",
	])("refuses a page's request with no Origin (Sec-Fetch-Site: %s)", (site) =>
		expect(refusedCaptureRequest({ "sec-fetch-site": site })).toMatch(
			/Sec-Fetch-Site/,
		));
});
