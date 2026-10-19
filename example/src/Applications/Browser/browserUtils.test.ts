import { describe, expect, it } from "vitest";
import { normalizeUrl } from "./browserUtils";

describe("normalizeUrl", () => {
	it("drops a leading www. and trailing slashes", () => {
		expect(normalizeUrl("https://www.example.com/path///")).toBe(
			"https://example.com/path",
		);
		expect(normalizeUrl("https://example.com/")).toBe("https://example.com");
	});

	it("trims trailing slashes from a string that is not a URL", () => {
		expect(normalizeUrl("relative/page//")).toBe("relative/page");
		expect(normalizeUrl("///")).toBe("");
	});

	it("stays fast on a long run of slashes that are not trailing", () => {
		const hostile = `${"/".repeat(100_000)}x`;
		const start = performance.now();
		expect(normalizeUrl(hostile)).toBe(hostile);
		expect(performance.now() - start).toBeLessThan(250);
	});
});
