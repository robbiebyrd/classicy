import { describe, expect, it } from "vitest";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import { classicyAppIdentityFrom } from "@/Appearance/ClassicyAppIdentity";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";
import {
	classicyDesktopFocusIconId,
	classicyDesktopIconRectRange,
	classicyDesktopIconSelection,
	classicyDesktopKeyCommand,
	classicyDesktopListboxAttributes,
	classicyDesktopSpaceSelection,
	type KeyNavIcon,
	nearestIconInDirection,
	typeaheadMatch,
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

	it("finds an app by the display name its icon is mapped to", () => {
		// ClassicyDesktop maps each unlabeled app_shortcut icon's label to the
		// active package's display name before type-select.
		const overrides = { "TV.app": { name: "Television" } };
		const icons: KeyNavIcon[] = [
			{ appId: "Scrapbook.app", appName: "Scrapbook" },
			{ appId: "TV.app", appName: "TV" },
		].map((i) => ({
			...i,
			label: classicyAppIdentityFrom(overrides, i.appId, {
				name: i.appName,
				icon: "",
			}).name,
		}));
		expect(typeaheadMatch(icons, "Tel")).toBe("TV.app");
		expect(typeaheadMatch(icons, "TV")).toBeNull();
	});

	it("matches the user-described sequence: C → Controls, Pa → Pager Decoder, Newsg → Newsgroups", () => {
		expect(typeaheadMatch(apps, "C")).toBe("controls");
		expect(typeaheadMatch(apps, "Pa")).toBe("pager");
		expect(typeaheadMatch(apps, "Newsg")).toBe("newsgroups");
	});
});

// The desktop's Windows selection rules (the audit's 5.10, 5.16, 5.17, 5.18
// and B.2; WIG Ch.5 "Selection Adjustment", pp.38-39, Table 5.1, pp.35-36,
// "Keyboard Selection", "Contiguous Selection", p.43, "Disjoint
// Selection", pp.43-44; App. A Tables A.2 and A.3; App. B Table B.1), under
// Windows 98's layout and the default (Mac OS 8) one. The grid's icons are
// 100 px apart; a 64 px cell keeps each box clear of the next icon.
const mac = CLASSICY_DEFAULT_APPEARANCE_LAYOUT;
const windows = windows98.layout as ClassicyAppearanceLayout;
const CELL = 64;

describe("classicyDesktopFocusIconId", () => {
	it("is the focus icon while it is drawn, else the first in the desktop's order", () => {
		expect(classicyDesktopFocusIconId(grid, "E")).toBe("E");
		expect(classicyDesktopFocusIconId(grid, undefined)).toBe("A");
		expect(classicyDesktopFocusIconId(grid, null)).toBe("A");
		expect(classicyDesktopFocusIconId(grid, "gone")).toBe("A");
		// The desktop's order, not the positions: an icon dropped last stays
		// last wherever it lies.
		expect(
			classicyDesktopFocusIconId(
				[
					{ appId: "Z", appName: "Z", location: [900, 900] },
					{ appId: "A", appName: "A", location: [0, 0] },
				],
				undefined,
			),
		).toBe("Z");
		expect(classicyDesktopFocusIconId([], "E")).toBeNull();
	});
});

describe("classicyDesktopIconRectRange", () => {
	it("takes the icons whose corner lies in the anchor's and the icon's boxes", () => {
		expect(classicyDesktopIconRectRange(grid, "A", "E", CELL)).toEqual([
			"A",
			"B",
			"D",
			"E",
		]);
		// Either way round, in the desktop's order.
		expect(classicyDesktopIconRectRange(grid, "I", "B", CELL)).toEqual([
			"B",
			"C",
			"E",
			"F",
			"H",
			"I",
		]);
		expect(classicyDesktopIconRectRange(grid, "E", "E", CELL)).toEqual(["E"]);
	});

	it("leaves out an icon on the boxes' right or bottom edge", () => {
		// A's box ends at 164: an icon at x 164 is outside, one at 163 in.
		const icons: KeyNavIcon[] = [
			{ appId: "A", appName: "A", location: [100, 100] },
			{ appId: "in", appName: "in", location: [163, 100] },
			{ appId: "out", appName: "out", location: [164, 100] },
		];
		expect(classicyDesktopIconRectRange(icons, "A", "A", CELL)).toEqual([
			"A",
			"in",
		]);
	});

	it("is the icon alone when either has no location", () => {
		const icons: KeyNavIcon[] = [
			...grid,
			{ appId: "nowhere", appName: "Nowhere" },
		];
		expect(classicyDesktopIconRectRange(icons, "nowhere", "E", CELL)).toEqual([
			"E",
		]);
		expect(classicyDesktopIconRectRange(icons, "A", "nowhere", CELL)).toEqual([
			"nowhere",
		]);
	});
});

describe("classicyDesktopIconSelection", () => {
	it("toggles the icon and makes it the anchor", () => {
		expect(
			classicyDesktopIconSelection(grid, ["A"], "A", "E", "toggle", CELL),
		).toEqual({ selected: ["A", "E"], anchor: "E" });
		expect(
			classicyDesktopIconSelection(grid, ["A", "E"], "A", "E", "toggle", CELL),
		).toEqual({ selected: ["A"], anchor: "E" });
	});

	it("replaces the selection with the anchor's rectangle, the anchor staying", () => {
		expect(
			classicyDesktopIconSelection(grid, ["A", "I"], "A", "E", "range", CELL),
		).toEqual({ selected: ["A", "B", "D", "E"], anchor: "A" });
	});

	it("sets the anchor's rectangle to the anchor's state, keeping the rest", () => {
		// A selected: the rectangle is added, I kept.
		expect(
			classicyDesktopIconSelection(
				grid,
				["A", "I"],
				"A",
				"E",
				"addRange",
				CELL,
			),
		).toEqual({ selected: ["A", "I", "B", "D", "E"], anchor: "A" });
		// A unselected (a Control-click took it out): the rectangle goes.
		expect(
			classicyDesktopIconSelection(
				grid,
				["B", "E", "I"],
				"A",
				"E",
				"addRange",
				CELL,
			),
		).toEqual({ selected: ["I"], anchor: "A" });
	});

	it("makes the icon the anchor when there is none", () => {
		for (const anchor of [undefined, null, "gone"]) {
			expect(
				classicyDesktopIconSelection(grid, ["A"], anchor, "E", "range", CELL),
			).toEqual({ selected: ["E"], anchor: "E" });
			expect(
				classicyDesktopIconSelection(
					grid,
					["A"],
					anchor,
					"E",
					"addRange",
					CELL,
				),
			).toEqual({ selected: ["A", "E"], anchor: "E" });
		}
	});
});

describe("classicyDesktopSpaceSelection", () => {
	const space = (
		m: Partial<
			Record<"shiftKey" | "ctrlKey" | "metaKey" | "altKey", boolean>
		> = {},
	) => ({
		key: " ",
		shiftKey: false,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		...m,
	});

	it("selects, toggles with Control or ⌘, extends with Shift", () => {
		expect(classicyDesktopSpaceSelection(space())).toBe("select");
		expect(classicyDesktopSpaceSelection(space({ ctrlKey: true }))).toBe(
			"toggle",
		);
		expect(classicyDesktopSpaceSelection(space({ metaKey: true }))).toBe(
			"toggle",
		);
		expect(classicyDesktopSpaceSelection(space({ shiftKey: true }))).toBe(
			"range",
		);
		// Shift wins, as in LISTVIEW_KeySelection.
		expect(
			classicyDesktopSpaceSelection(space({ shiftKey: true, ctrlKey: true })),
		).toBe("range");
	});

	it("leaves Option-Space and other keys alone", () => {
		expect(classicyDesktopSpaceSelection(space({ altKey: true }))).toBeNull();
		expect(
			classicyDesktopSpaceSelection({ ...space(), key: "Enter" }),
		).toBeNull();
	});
});

describe("classicyDesktopKeyCommand", () => {
	const key = (
		k: string,
		m: Partial<
			Record<
				"shiftKey" | "ctrlKey" | "metaKey" | "altKey" | "defaultPrevented",
				boolean
			>
		> = {},
	) => ({
		key: k,
		shiftKey: false,
		ctrlKey: false,
		metaKey: false,
		altKey: false,
		...m,
	});
	const run = (
		e: ReturnType<typeof key>,
		state: { selectedIds?: string[]; focusIconId?: string | null } = {},
		layout: Pick<ClassicyAppearanceLayout, "selection"> = windows,
	) =>
		classicyDesktopKeyCommand(e, {
			icons: grid,
			selectedIds: state.selectedIds ?? [],
			focusIconId: state.focusIconId,
			layout,
		});

	it("leaves every key to the desktop's own branches without the keys", () => {
		for (const k of [
			"ArrowRight",
			"ArrowUp",
			"Home",
			"End",
			"PageUp",
			"PageDown",
			" ",
		]) {
			for (const m of [{}, { shiftKey: true }, { ctrlKey: true }])
				expect(
					run(key(k, m), { selectedIds: ["E"], focusIconId: "E" }, mac),
				).toEqual({ type: "none" });
		}
	});

	it("moves from the focus icon with an arrow, selecting where it lands", () => {
		expect(
			run(key("ArrowRight"), { selectedIds: ["A"], focusIconId: "E" }),
		).toEqual({ type: "select", iconId: "F" });
		// No focus icon: from the first selected icon.
		expect(run(key("ArrowDown"), { selectedIds: ["B"] })).toEqual({
			type: "select",
			iconId: "E",
		});
		// Nothing selected and no focus icon: the first icon.
		expect(run(key("ArrowLeft"))).toEqual({ type: "select", iconId: "A" });
		// The focus survives an empty selection (LVIS_FOCUSED stays).
		expect(run(key("ArrowUp"), { focusIconId: "E" })).toEqual({
			type: "select",
			iconId: "B",
		});
	});

	it("keeps the focus where it is when nothing lies that way", () => {
		expect(
			run(key("ArrowLeft"), { selectedIds: ["A", "B"], focusIconId: "A" }),
		).toEqual({ type: "focus", iconId: "A" });
		expect(
			run(key("ArrowLeft", { shiftKey: true }), { focusIconId: "A" }),
		).toEqual({ type: "focus", iconId: "A" });
	});

	it("goes to the first and last icon with Home, End and the page keys", () => {
		for (const k of ["Home", "PageUp"])
			expect(run(key(k), { focusIconId: "E" })).toEqual({
				type: "select",
				iconId: "A",
			});
		for (const k of ["End", "PageDown"])
			expect(run(key(k), { focusIconId: "E" })).toEqual({
				type: "select",
				iconId: "I",
			});
	});

	it("extends from the anchor with Shift, Control or not", () => {
		expect(
			run(key("ArrowRight", { shiftKey: true }), { focusIconId: "E" }),
		).toEqual({ type: "range", iconId: "F" });
		expect(
			run(key("End", { shiftKey: true, ctrlKey: true }), { focusIconId: "E" }),
		).toEqual({ type: "range", iconId: "I" });
	});

	it("moves the focus icon alone with Control, ⌘ or Option", () => {
		for (const m of [{ ctrlKey: true }, { metaKey: true }, { altKey: true }]) {
			expect(
				run(key("ArrowDown", m), { selectedIds: ["E"], focusIconId: "E" }),
			).toEqual({ type: "focus", iconId: "H" });
			expect(run(key("Home", m), { focusIconId: "E" })).toEqual({
				type: "focus",
				iconId: "A",
			});
		}
	});

	it("selects with Control when Windows' selection keys are off", () => {
		const rovingOnly = { selection: { iconNavigation: "roving" as const } };
		expect(
			run(
				key("ArrowDown", { ctrlKey: true }),
				{ focusIconId: "E" },
				rovingOnly,
			),
		).toEqual({ type: "select", iconId: "H" });
		// And leaves Space alone.
		expect(run(key(" "), { focusIconId: "E" }, rovingOnly)).toEqual({
			type: "none",
		});
	});

	it("selects, toggles or extends to the focus icon with Space", () => {
		expect(run(key(" "), { selectedIds: ["A"], focusIconId: "E" })).toEqual({
			type: "select",
			iconId: "E",
		});
		expect(
			run(key(" ", { ctrlKey: true }), {
				selectedIds: ["A"],
				focusIconId: "E",
			}),
		).toEqual({ type: "toggle", iconId: "E" });
		expect(run(key(" ", { shiftKey: true }), { focusIconId: "E" })).toEqual({
			type: "range",
			iconId: "E",
		});
		// No focus icon: the first, the desktop's Tab stop.
		expect(run(key(" "))).toEqual({ type: "select", iconId: "A" });
		expect(run(key(" ", { altKey: true }), { focusIconId: "E" })).toEqual({
			type: "none",
		});
	});

	it("leaves a key an icon handled, other keys, and an empty desktop alone", () => {
		expect(
			run(key(" ", { defaultPrevented: true }), { focusIconId: "E" }),
		).toEqual({ type: "none" });
		expect(run(key("a"), { focusIconId: "E" })).toEqual({ type: "none" });
		expect(run(key("Delete"), { focusIconId: "E" })).toEqual({ type: "none" });
		expect(
			classicyDesktopKeyCommand(key("ArrowRight"), {
				icons: [],
				selectedIds: [],
				layout: windows,
			}),
		).toEqual({ type: "none" });
	});
});

describe("classicyDesktopListboxAttributes", () => {
	it("makes the desktop a multiple selection list box under Windows' selection keys", () => {
		expect(classicyDesktopListboxAttributes(windows)).toEqual({
			role: "listbox",
			"aria-multiselectable": true,
		});
		expect(classicyDesktopListboxAttributes(mac)).toEqual({});
	});
});
