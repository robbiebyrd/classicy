import { describe, expect, it } from "vitest";
import {
	asFinderDate,
	finderEntryComparator,
	formatFinderDate,
	iconViewIconSize,
	listViewIconSize,
} from "@/SystemFolder/Finder/FinderViewOptions";

const THEME_BASE = 48;

describe("icon sizing", () => {
	it("scales the icons view relative to the theme base", () => {
		expect(iconViewIconSize(THEME_BASE, "small")).toBe(24);
		expect(iconViewIconSize(THEME_BASE, "large")).toBe(48);
	});

	it("resolves a stored icons-view 'medium' to large", () => {
		// The Icons pane offers two radios; 'medium' can only arrive from
		// hand-edited or list-shaped persisted state.
		expect(iconViewIconSize(THEME_BASE, "medium")).toBe(48);
	});

	it("reproduces today's 18px list view at the medium step", () => {
		expect(listViewIconSize(THEME_BASE, "small")).toBe(12);
		expect(listViewIconSize(THEME_BASE, "medium")).toBe(18);
		expect(listViewIconSize(THEME_BASE, "large")).toBe(32);
	});

	it("tracks a different theme base", () => {
		expect(listViewIconSize(32, "medium")).toBe(12);
	});
});

describe("finderEntryComparator", () => {
	const a = {
		name: "Apple",
		size: 300,
		kind: "file",
		label: "Hot",
		modifiedOn: new Date("2001-09-11T12:00:00Z"),
	};
	const b = {
		name: "banana",
		size: 100,
		kind: "directory",
		label: "Cool",
		modifiedOn: new Date("2001-09-10T12:00:00Z"),
	};

	it("sorts by name case-insensitively", () => {
		expect(finderEntryComparator("name")(a, b)).toBeLessThan(0);
	});

	it("sorts by size ascending", () => {
		expect(finderEntryComparator("size")(a, b)).toBeGreaterThan(0);
	});

	it("sorts by modified date oldest first", () => {
		expect(finderEntryComparator("modified")(a, b)).toBeGreaterThan(0);
	});

	it("sorts by kind, then breaks ties by name", () => {
		const c = { name: "zebra", kind: "file" };
		const d = { name: "aardvark", kind: "file" };
		expect(finderEntryComparator("kind")(c, d)).toBeGreaterThan(0);
	});

	it("puts entries missing the sort field last, ordered by name", () => {
		const withDate = {
			name: "has",
			createdOn: new Date("2001-09-01T00:00:00Z"),
		};
		const without = { name: "none" };
		expect(finderEntryComparator("created")(withDate, without)).toBeLessThan(0);
		expect(finderEntryComparator("created")(without, withDate)).toBeGreaterThan(
			0,
		);
	});

	it("is stable for two entries with no comparable field", () => {
		expect(finderEntryComparator("label")({ name: "a" }, { name: "a" })).toBe(
			0,
		);
	});
});

describe("formatFinderDate", () => {
	// The in-world "now": 9/11/2001, 9:03 AM, already converted to the
	// virtual-clock local frame by the caller.
	const now = new Date(2001, 8, 11, 9, 3);

	it("renders an em dash for a missing date", () => {
		expect(formatFinderDate(undefined, now, true)).toBe("—");
	});

	it("says Today for the same in-world day", () => {
		expect(formatFinderDate(new Date(2001, 8, 11, 8, 46), now, true)).toBe(
			"Today, 8:46 AM",
		);
	});

	it("says Yesterday for the prior in-world day", () => {
		expect(formatFinderDate(new Date(2001, 8, 10, 16, 12), now, true)).toBe(
			"Yesterday, 4:12 PM",
		);
	});

	it("falls back to an absolute date for anything older", () => {
		expect(formatFinderDate(new Date(2001, 8, 4, 9, 3), now, true)).toBe(
			"Tue, Sep 4, 2001",
		);
	});

	it("renders date and time when relative dates are off", () => {
		expect(formatFinderDate(new Date(2001, 8, 11, 8, 46), now, false)).toBe(
			"Tue, Sep 11, 2001, 8:46 AM",
		);
	});

	it("renders midnight as 12:00 AM, not 0:00", () => {
		expect(formatFinderDate(new Date(2001, 8, 11, 0, 0), now, true)).toBe(
			"Today, 12:00 AM",
		);
	});

	it("renders noon as 12:00 PM", () => {
		expect(formatFinderDate(new Date(2001, 8, 11, 12, 0), now, true)).toBe(
			"Today, 12:00 PM",
		);
	});

	it("handles a month boundary when computing yesterday", () => {
		const firstOfMonth = new Date(2001, 8, 1, 9, 0);
		expect(
			formatFinderDate(new Date(2001, 7, 31, 9, 0), firstOfMonth, true),
		).toBe("Yesterday, 9:00 AM");
	});
});

describe("asFinderDate", () => {
	it("passes a Date through", () => {
		const d = new Date(2001, 8, 11, 8, 46);
		expect(asFinderDate(d)).toBe(d);
	});

	it("revives an ISO string, because the file system JSON round-trips", () => {
		const revived = asFinderDate("2001-09-11T12:46:00.000Z");
		expect(revived?.toISOString()).toBe("2001-09-11T12:46:00.000Z");
	});

	it("returns undefined for undefined, null, and unparseable input", () => {
		expect(asFinderDate(undefined)).toBeUndefined();
		expect(asFinderDate(null)).toBeUndefined();
		expect(asFinderDate("not a date")).toBeUndefined();
		expect(asFinderDate({})).toBeUndefined();
	});

	it("accepts an epoch number", () => {
		expect(asFinderDate(0)?.getTime()).toBe(0);
	});
});
