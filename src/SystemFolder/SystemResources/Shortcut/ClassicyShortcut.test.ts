import { describe, expect, it } from "vitest";
import {
	isSameOriginUrl,
	readShortcutDisposition,
} from "@/SystemFolder/SystemResources/Shortcut/ClassicyShortcut";

describe("readShortcutDisposition", () => {
	it("passes through each valid disposition", () => {
		expect(readShortcutDisposition("classicy")).toBe("classicy");
		expect(readShortcutDisposition("browser")).toBe("browser");
		expect(readShortcutDisposition("browser-new")).toBe("browser-new");
	});

	// Dispositions arrive from localStorage and (in consumers) from a synced
	// remote filesystem, so anything at all can land here.
	it("defaults to the in-desktop viewer for junk", () => {
		expect(readShortcutDisposition(undefined)).toBe("classicy");
		expect(readShortcutDisposition(null)).toBe("classicy");
		expect(readShortcutDisposition("")).toBe("classicy");
		expect(readShortcutDisposition("BROWSER")).toBe("classicy");
		expect(readShortcutDisposition(42)).toBe("classicy");
		expect(readShortcutDisposition({ disposition: "browser" })).toBe(
			"classicy",
		);
	});
});

describe("isSameOriginUrl", () => {
	// jsdom serves tests from http://localhost:3000 by default.
	it("treats relative paths as same-origin", () => {
		expect(isSameOriginUrl("/press")).toBe(true);
		expect(isSameOriginUrl("/teachers")).toBe(true);
	});

	it("compares absolute URLs against the current origin", () => {
		expect(isSameOriginUrl(`${window.location.origin}/press`)).toBe(true);
		expect(isSameOriginUrl("https://example.com/press")).toBe(false);
	});

	// A protocol-relative URL resolves against the current protocol, so it is
	// same-origin only when the host also matches.
	it("handles protocol-relative URLs", () => {
		expect(isSameOriginUrl(`//${window.location.host}/press`)).toBe(true);
		expect(isSameOriginUrl("//example.com/press")).toBe(false);
	});

	it("returns false for unparseable input rather than throwing", () => {
		expect(isSameOriginUrl("http://[")).toBe(false);
		expect(isSameOriginUrl("")).toBe(false);
	});
});
