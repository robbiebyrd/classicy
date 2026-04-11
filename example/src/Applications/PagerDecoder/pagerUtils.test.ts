import { describe, expect, it } from "vitest";
import {
	extractTimeKey,
	matchesFilter,
	matchesWildcard,
	parseJsonlLine,
} from "./pagerUtils";
import type { PagerDecoderFilter } from "./PagerDecoderContext";

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
			channel: "B",
			mode: "ALPHA",
			message: "Server is UP",
		});
		const result = parseJsonlLine(line);
		expect(result).not.toBeNull();
		expect(result?.provider).toBe("Metrocall");
		expect(result?.message).toBe("Server is UP");
		expect(result?.timestamp).toBe("2001-09-11 03:00:01");
		expect(result?.recipient_id).toBe("0485957");
		expect(result?.id_type).toBe("capcode");
		expect(result?.channel).toBe("B");
	});

	it("returns null for non-ALPHA mode ST NUM", () => {
		const line = JSON.stringify({
			timestamp: "2001-09-11 03:00:01",
			provider: "Arch",
			recipient_id: "0485957",
			id_type: "capcode",
			channel: "B",
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
			channel: "A",
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
			channel: "B",
			mode: "ALPHA",
			message: "",
		});
		expect(parseJsonlLine(line)).toBeNull();
	});
});

describe("matchesWildcard", () => {
	it("empty pattern matches everything", () => {
		expect(matchesWildcard("anything", "")).toBe(true);
	});

	it("exact match without wildcard", () => {
		expect(matchesWildcard("Metrocall", "Metrocall")).toBe(true);
		expect(matchesWildcard("Metrocall", "Arch")).toBe(false);
	});

	it("prefix wildcard (*text matches end)", () => {
		expect(matchesWildcard("Hello world", "*world")).toBe(true);
		expect(matchesWildcard("Hello world", "*Hello")).toBe(false);
	});

	it("suffix wildcard (text* matches start)", () => {
		expect(matchesWildcard("Hello world", "Hello*")).toBe(true);
		expect(matchesWildcard("Hello world", "world*")).toBe(false);
	});

	it("contains wildcard (*text* matches anywhere)", () => {
		expect(matchesWildcard("Hello world", "*lo wo*")).toBe(true);
		expect(matchesWildcard("Hello world", "*xyz*")).toBe(false);
	});

	it("bare * matches everything", () => {
		expect(matchesWildcard("anything", "*")).toBe(true);
	});

	it("is case-insensitive", () => {
		expect(matchesWildcard("Metrocall", "metrocall")).toBe(true);
	});
});

describe("matchesFilter", () => {
	const baseRecord = {
		timestamp: "2001-09-11 03:00:01",
		provider: "Metrocall",
		recipient_id: "0485957",
		id_type: "capcode",
		channel: "B",
		mode: "ALPHA",
		message: "Server is UP",
	};
	const emptyFilter: PagerDecoderFilter = {
		provider: "",
		id_type: "",
		channel: "",
		mode: "",
		recipient_id: "",
		message: "",
	};

	it("empty filter matches all records", () => {
		expect(matchesFilter(baseRecord, emptyFilter)).toBe(true);
	});

	it("provider filter exact match", () => {
		expect(matchesFilter(baseRecord, { ...emptyFilter, provider: "Metrocall" })).toBe(true);
		expect(matchesFilter(baseRecord, { ...emptyFilter, provider: "Arch" })).toBe(false);
	});

	it("id_type filter exact match", () => {
		expect(matchesFilter(baseRecord, { ...emptyFilter, id_type: "capcode" })).toBe(true);
		expect(matchesFilter(baseRecord, { ...emptyFilter, id_type: "other" })).toBe(false);
	});

	it("channel filter exact match", () => {
		expect(matchesFilter(baseRecord, { ...emptyFilter, channel: "B" })).toBe(true);
		expect(matchesFilter(baseRecord, { ...emptyFilter, channel: "A" })).toBe(false);
	});

	it("message wildcard filter", () => {
		expect(matchesFilter(baseRecord, { ...emptyFilter, message: "Server*" })).toBe(true);
		expect(matchesFilter(baseRecord, { ...emptyFilter, message: "*UP" })).toBe(true);
		expect(matchesFilter(baseRecord, { ...emptyFilter, message: "Down*" })).toBe(false);
	});

	it("recipient_id wildcard filter", () => {
		expect(matchesFilter(baseRecord, { ...emptyFilter, recipient_id: "048*" })).toBe(true);
		expect(matchesFilter(baseRecord, { ...emptyFilter, recipient_id: "999*" })).toBe(false);
	});
});

