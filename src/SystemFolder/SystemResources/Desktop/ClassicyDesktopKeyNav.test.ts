import { describe, expect, it } from "vitest";
import {
	nearestIconInDirection,
	typeaheadMatch,
	type KeyNavIcon,
} from "./ClassicyDesktopKeyNav";

// Grid layout used across many tests:
//
//   A(100,100)   B(200,100)   C(300,100)
//   D(100,200)   E(200,200)   F(300,200)
//   G(100,300)   H(200,300)   I(300,300)
//
// location is [x, y] = [left, top]

const grid: KeyNavIcon[] = [
	{ appId: "A", appName: "Alpha", location: [100, 100] },
	{ appId: "B", appName: "Beta", location: [200, 100] },
	{ appId: "C", appName: "Gamma", location: [300, 100] },
	{ appId: "D", appName: "Delta", location: [100, 200] },
	{ appId: "E", appName: "Epsilon", location: [200, 200] },
	{ appId: "F", appName: "Zeta", location: [300, 200] },
	{ appId: "G", appName: "Eta", location: [100, 300] },
	{ appId: "H", appName: "Theta", location: [200, 300] },
	{ appId: "I", appName: "Iota", location: [300, 300] },
];

describe("nearestIconInDirection", () => {
	it("moves right from the center", () => {
		expect(nearestIconInDirection(grid, "E", "ArrowRight")).toBe("F");
	});

	it("moves left from the center", () => {
		expect(nearestIconInDirection(grid, "E", "ArrowLeft")).toBe("D");
	});

	it("moves down from the center", () => {
		expect(nearestIconInDirection(grid, "E", "ArrowDown")).toBe("H");
	});

	it("moves up from the center", () => {
		expect(nearestIconInDirection(grid, "E", "ArrowUp")).toBe("B");
	});

	it("returns null when there is no icon in the requested direction", () => {
		// A is top-left; nothing is above or to its left
		expect(nearestIconInDirection(grid, "A", "ArrowUp")).toBeNull();
		expect(nearestIconInDirection(grid, "A", "ArrowLeft")).toBeNull();
		// I is bottom-right
		expect(nearestIconInDirection(grid, "I", "ArrowDown")).toBeNull();
		expect(nearestIconInDirection(grid, "I", "ArrowRight")).toBeNull();
	});

	it("picks the closest icon when multiple qualify", () => {
		// From A, both B (right at same row) and C (further right) qualify.
		// B is nearer, so it should win.
		expect(nearestIconInDirection(grid, "A", "ArrowRight")).toBe("B");
	});

	it("returns null for an icon with no location", () => {
		const icons: KeyNavIcon[] = [
			{ appId: "X", appName: "X", location: undefined },
			{ appId: "Y", appName: "Y", location: [200, 200] },
		];
		expect(nearestIconInDirection(icons, "X", "ArrowRight")).toBeNull();
	});

	it("returns null when the currentId is not in the list", () => {
		expect(nearestIconInDirection(grid, "Missing", "ArrowRight")).toBeNull();
	});

	it("ignores icons without a location as candidates", () => {
		const icons: KeyNavIcon[] = [
			{ appId: "A", appName: "A", location: [100, 200] },
			{ appId: "B", appName: "B", location: undefined }, // no location → skip
			{ appId: "C", appName: "C", location: [300, 200] },
		];
		// From A going right, B has no location so C should win
		expect(nearestIconInDirection(icons, "A", "ArrowRight")).toBe("C");
	});

	it("uses 45-degree sector: diagonal icons go to the dominant axis", () => {
		// An icon that is equally right and down (45°) sits on the boundary.
		// With |dx| >= |dy| (equal), it qualifies for Right but not Down (strict >).
		const icons: KeyNavIcon[] = [
			{ appId: "origin", appName: "Origin", location: [0, 0] },
			{ appId: "diag", appName: "Diagonal", location: [100, 100] }, // dx==dy → Right, not Down
		];
		expect(nearestIconInDirection(icons, "origin", "ArrowRight")).toBe("diag");
		expect(nearestIconInDirection(icons, "origin", "ArrowDown")).toBeNull();
	});
});

describe("typeaheadMatch", () => {
	const apps: KeyNavIcon[] = [
		{ appId: "controls", appName: "Controls" },
		{ appId: "news", appName: "News" },
		{ appId: "newsgroups", appName: "Newsgroups" },
		{ appId: "pager", appName: "Pager Decoder" },
		{ appId: "radio", appName: "Radio Scanner" },
		{ appId: "tv", appName: "TV" },
		{ appId: "browser", appName: "Browser" },
	];

	it("selects the only match for an unambiguous prefix", () => {
		expect(typeaheadMatch(apps, "C")).toBe("controls");
	});

	it("selects the first alphabetical match when multiple icons share a prefix", () => {
		// 'N' matches both 'News' and 'Newsgroups'; 'News' < 'Newsgroups' alphabetically
		expect(typeaheadMatch(apps, "N")).toBe("news");
		expect(typeaheadMatch(apps, "News")).toBe("news");
	});

	it("narrows to the longer match as the prefix grows", () => {
		expect(typeaheadMatch(apps, "Newsg")).toBe("newsgroups");
	});

	it("is case-insensitive", () => {
		expect(typeaheadMatch(apps, "pa")).toBe("pager");
		expect(typeaheadMatch(apps, "PA")).toBe("pager");
	});

	it("matches 'Pa' to Pager Decoder", () => {
		expect(typeaheadMatch(apps, "Pa")).toBe("pager");
	});

	it("returns null when no icon matches the prefix", () => {
		expect(typeaheadMatch(apps, "Z")).toBeNull();
	});

	it("returns null for an empty prefix", () => {
		expect(typeaheadMatch(apps, "")).toBeNull();
	});

	it("uses the label field instead of appName when present", () => {
		const icons: KeyNavIcon[] = [
			{ appId: "x", appName: "Internal Name", label: "Friendly Name" },
		];
		expect(typeaheadMatch(icons, "Friendly")).toBe("x");
		expect(typeaheadMatch(icons, "Internal")).toBeNull();
	});

	it("matches the user-described sequence: C → Controls, Pa → Pager Decoder, Newsg → Newsgroups", () => {
		expect(typeaheadMatch(apps, "C")).toBe("controls");
		expect(typeaheadMatch(apps, "Pa")).toBe("pager");
		expect(typeaheadMatch(apps, "Newsg")).toBe("newsgroups");
	});
});
