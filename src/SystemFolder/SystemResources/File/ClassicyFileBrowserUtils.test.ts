import { describe, expect, it } from "vitest";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	capitalizeFirst,
	cleanupIcon,
	createGrid,
	fileTypeDisplayName,
	getGridPosition,
	iconGridLattice,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserUtils";
import { snapToGrid } from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";

describe("fileTypeDisplayName", () => {
	it("shows app shortcuts as Application", () => {
		expect(fileTypeDisplayName("app_shortcut")).toBe("Application");
	});

	it("humanizes underscored types", () => {
		expect(fileTypeDisplayName("text_file")).toBe("Text file");
	});

	it("capitalizes simple types", () => {
		expect(fileTypeDisplayName("directory")).toBe("Directory");
		expect(fileTypeDisplayName("pdf")).toBe("Pdf");
	});
});

describe("capitalizeFirst", () => {
	it("capitalizes the first letter of a lowercase string", () => {
		expect(capitalizeFirst("hello")).toBe("Hello");
	});

	it("leaves an already-capitalized string unchanged", () => {
		expect(capitalizeFirst("Hello")).toBe("Hello");
	});

	it("returns an empty string for empty input", () => {
		expect(capitalizeFirst("")).toBe("");
	});

	it("capitalizes a single character", () => {
		expect(capitalizeFirst("a")).toBe("A");
	});
});

describe("createGrid", () => {
	it("computes column and row counts for a standard container", () => {
		// iconSize=32, iconPadding=8 → cell = 32*2+8 = 72
		// cols = floor(720/72) = 10, rows = floor(480/72) = 6
		expect(createGrid(32, 8, [720, 480])).toEqual([10, 6]);
	});

	it("returns [0, 0] when the container is smaller than one cell", () => {
		// iconSize=32, iconPadding=8 → cell = 72; container=[50,50]
		// floor(50/72) = 0 in both dimensions
		expect(createGrid(32, 8, [50, 50])).toEqual([0, 0]);
	});
});

describe("getGridPosition", () => {
	it("maps index 0 to the first cell [0, 0]", () => {
		expect(getGridPosition(0, [10, 6])).toEqual([0, 0]);
	});

	it("maps index 5 to the sixth column in the first row", () => {
		expect(getGridPosition(5, [10, 6])).toEqual([5, 0]);
	});

	it("maps index 10 to the first column in the second row", () => {
		expect(getGridPosition(10, [10, 6])).toEqual([0, 1]);
	});

	it("maps index 15 to the sixth column in the second row", () => {
		expect(getGridPosition(15, [10, 6])).toEqual([5, 1]);
	});
});

describe("cleanupIcon size override", () => {
	const theme = { desktop: { iconSize: 48 } } as ClassicyTheme;

	it("uses the theme size when no override is given", () => {
		// Padding is iconSize / 4 = 12; index 0 sits at [12, 12].
		expect(cleanupIcon(theme, 0, 1, [500, 500])).toEqual([12, 12]);
	});

	it("spaces columns by the override, not the theme size", () => {
		// A 24px override halves the horizontal step: 12 + 24 * 2 * 1 = 60.
		expect(cleanupIcon(theme, 1, 2, [500, 500], 24)).toEqual([60, 12]);
	});

	it("keeps padding derived from the theme so the origin is unchanged", () => {
		expect(cleanupIcon(theme, 0, 1, [500, 500], 24)).toEqual([12, 12]);
	});
});

describe("iconGridLattice agrees with cleanupIcon", () => {
	const theme = { desktop: { iconSize: 48 } } as ClassicyTheme;
	// createGrid(48, 12, [500, 500]) = floor(500 / 108) = 4 columns, so index 1
	// is cell (1, 0) and index 5 is cell (1, 1).
	const container: [number, number] = [500, 500];

	it("describes the same origin and pitch the layout uses", () => {
		// Padding 48 / 4 = 12; a cell is two icon widths, 96.
		expect(iconGridLattice(theme)).toEqual({
			origin: [12, 12],
			pitch: [96, 96],
		});
	});

	it("snaps a drop onto exactly the cell cleanupIcon would lay out", () => {
		const { origin, pitch } = iconGridLattice(theme);
		// Cell (1, 1) is laid out at [108, 108]; a drop anywhere inside that
		// cell must round back to it, not to a half-row at 96 or 144.
		expect(cleanupIcon(theme, 5, 6, container)).toEqual([108, 108]);
		expect(snapToGrid([140, 140], pitch, origin)).toEqual([108, 108]);
		expect(snapToGrid([80, 80], pitch, origin)).toEqual([108, 108]);
		// Cell (1, 0).
		expect(cleanupIcon(theme, 1, 6, container)).toEqual([108, 12]);
		expect(snapToGrid([120, 30], pitch, origin)).toEqual([108, 12]);
	});

	it("tracks the icon-size override in both the layout and the snap", () => {
		const { origin, pitch } = iconGridLattice(theme, 24);
		expect(pitch).toEqual([48, 48]);
		// createGrid(24, 12, [500, 500]) = floor(500 / 60) = 8 columns.
		expect(cleanupIcon(theme, 9, 10, container, 24)).toEqual([60, 60]);
		expect(snapToGrid([70, 70], pitch, origin)).toEqual([60, 60]);
	});
});
