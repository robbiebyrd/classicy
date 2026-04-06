import { describe, expect, it } from "vitest";
import { isValidHttpUrl } from "@/SystemFolder/SystemResources/Utils/urlValidation";

describe("isValidHttpUrl", () => {
	it("accepts https URLs", () => {
		expect(isValidHttpUrl("https://example.com/video.mp4")).toBe(true);
	});

	it("accepts http URLs", () => {
		expect(isValidHttpUrl("http://example.com/video.mp4")).toBe(true);
	});

	it("rejects javascript: URLs", () => {
		expect(isValidHttpUrl("javascript:alert(1)")).toBe(false);
	});

	it("rejects data: URLs", () => {
		expect(isValidHttpUrl("data:text/html,<script>alert(1)</script>")).toBe(
			false,
		);
	});

	it("rejects file: URLs", () => {
		expect(isValidHttpUrl("file:///etc/passwd")).toBe(false);
	});

	it("rejects empty strings", () => {
		expect(isValidHttpUrl("")).toBe(false);
	});

	it("rejects non-URL strings", () => {
		expect(isValidHttpUrl("not a url")).toBe(false);
	});

	it("accepts URLs with paths and query strings", () => {
		expect(
			isValidHttpUrl("https://cdn.example.com/path/to/video.mp4?token=abc"),
		).toBe(true);
	});

	it("accepts relative URLs when treated as relative paths", () => {
		expect(isValidHttpUrl("/assets/img/sample.jpg")).toBe(true);
	});
});
