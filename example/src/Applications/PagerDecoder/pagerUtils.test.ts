import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { extractTimeKey, getCurrentEasternHMS, parseJsonlLine } from "./pagerUtils";

describe("extractTimeKey", () => {
	it("extracts HH:MM:SS from a valid timestamp", () => {
		expect(extractTimeKey("2001-09-11 14:23:07")).toBe("14:23:07");
	});

	it("extracts time from midnight timestamp", () => {
		expect(extractTimeKey("2001-09-11 00:00:00")).toBe("00:00:00");
	});

	it("returns empty string for input with no space separator", () => {
		expect(extractTimeKey("not-a-timestamp")).toBe("");
	});

	it("returns empty string for empty string", () => {
		expect(extractTimeKey("")).toBe("");
	});

	it("returns empty string when time part is malformed", () => {
		expect(extractTimeKey("2001-09-11 1:2:3")).toBe("");
	});
});

describe("parseJsonlLine", () => {
	it("returns a PagerRecord for a valid ALPHA line", () => {
		const line = JSON.stringify({
			timestamp: "2001-09-11 03:00:01",
			provider: "Metrocall",
			recipient_id: "0485957",
			id_type: "capcode",
			unknown: "B",
			mode: "ALPHA",
			message: "Server is UP",
		});
		const result = parseJsonlLine(line);
		expect(result).not.toBeNull();
		expect(result?.provider).toBe("Metrocall");
		expect(result?.message).toBe("Server is UP");
		expect(result?.timestamp).toBe("2001-09-11 03:00:01");
		expect(result?.recipient_id).toBe("0485957");
	});

	it("returns null for non-ALPHA mode ST NUM", () => {
		const line = JSON.stringify({
			timestamp: "2001-09-11 03:00:01",
			provider: "Arch",
			recipient_id: "0485957",
			id_type: "capcode",
			unknown: "B",
			mode: "ST NUM",
			message: "9145551234",
		});
		expect(parseJsonlLine(line)).toBeNull();
	});

	it("returns null for numeric baud-rate mode", () => {
		const line = JSON.stringify({
			timestamp: "2001-09-11 03:00:01",
			provider: "Skytel",
			recipient_id: "0001234",
			id_type: "capcode",
			unknown: "A",
			mode: "1200",
			message: "some data",
		});
		expect(parseJsonlLine(line)).toBeNull();
	});

	it("returns null for malformed JSON", () => {
		expect(parseJsonlLine("{not valid json")).toBeNull();
	});

	it("returns null for empty string", () => {
		expect(parseJsonlLine("")).toBeNull();
	});

	it("returns null for whitespace-only string", () => {
		expect(parseJsonlLine("   ")).toBeNull();
	});

	it("returns null for ALPHA line with empty message", () => {
		const line = JSON.stringify({
			timestamp: "2001-09-11 03:00:01",
			provider: "Metrocall",
			recipient_id: "0485957",
			id_type: "capcode",
			unknown: "B",
			mode: "ALPHA",
			message: "",
		});
		expect(parseJsonlLine(line)).toBeNull();
	});
});

describe("getCurrentEasternHMS", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	it("returns correct HH:MM:SS for a known UTC time (EDT = UTC-4)", () => {
		// 08:30:15 UTC → 04:30:15 EDT
		vi.setSystemTime(new Date("2001-09-11T08:30:15.000Z"));
		expect(getCurrentEasternHMS()).toBe("04:30:15");
	});

	it("handles midnight boundary (00:00:00 ET = 04:00:00 UTC)", () => {
		vi.setSystemTime(new Date("2001-09-11T04:00:00.000Z"));
		expect(getCurrentEasternHMS()).toBe("00:00:00");
	});

	it("zero-pads single-digit hours, minutes, seconds", () => {
		// 07:01:05 UTC → 03:01:05 EDT
		vi.setSystemTime(new Date("2001-09-11T07:01:05.000Z"));
		expect(getCurrentEasternHMS()).toBe("03:01:05");
	});
});
