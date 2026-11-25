import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { getClassicyFileTypeNames } from "@/Appearance/ClassicyFileTypeNames";
import type { ClassicyTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import {
	capitalizeFirst,
	classicyFileTypeNameFrom,
	classicyFreeIconCell,
	classicyLineUpIconPlaces,
	cleanupIcon,
	createGrid,
	fileTypeDisplayName,
	getGridPosition,
	iconGridLattice,
	readClassicyDesktopIconMetrics,
	useClassicyFileTypeDisplayName,
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

	// The remaining chapters' audit's 10.2 (WIG Ch.10 "The Application
	// Identifier Key", pp.197-198): a package's `fileTypeNames` name the
	// types; one that names none keeps the core's.
	describe("with a package's names", () => {
		afterEach(() => resetClassicyAppearancePackagesForTests());
		const registerNamed = (
			id: string,
			fileTypeNames?: Record<string, string>,
		) =>
			registerClassicyAppearancePackage({
				id,
				name: id,
				css: "",
				defaults: {
					...CLASSICY_CORE_DEFAULT_THEME,
					id: `${id}-default`,
					package: id,
				},
				layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				...(fileTypeNames ? { fileTypeNames } : {}),
			});

		it("reads the given package's name, else the core's", () => {
			registerNamed("named", {
				directory: "File Folder",
				text_file: "Text Document",
			});
			registerNamed("plain");
			expect(fileTypeDisplayName("directory", "named")).toBe("File Folder");
			expect(fileTypeDisplayName("text_file", "named")).toBe("Text Document");
			// A type it names not.
			expect(fileTypeDisplayName("pdf", "named")).toBe("Pdf");
			expect(fileTypeDisplayName("directory", "plain")).toBe("Directory");
			expect(fileTypeDisplayName("app_shortcut", "plain")).toBe("Application");
			expect(getClassicyFileTypeNames("plain")).toEqual({});
		});

		it("stores a frozen copy, so the caller's object changes nothing", () => {
			const names: Record<string, string> = { directory: "File Folder" };
			registerNamed("copied", names);
			names.directory = "Changed";
			expect(fileTypeDisplayName("directory", "copied")).toBe("File Folder");
			expect(Object.isFrozen(getClassicyFileTypeNames("copied"))).toBe(true);
		});

		it("looks names up as own keys only", () => {
			expect(classicyFileTypeNameFrom({}, "constructor")).toBe("Constructor");
			expect(classicyFileTypeNameFrom({ video: "Video Clip" }, "video")).toBe(
				"Video Clip",
			);
		});

		it("follows the active package live (useClassicyFileTypeDisplayName)", () => {
			const { result } = renderHook(() => useClassicyFileTypeDisplayName());
			expect(result.current("directory")).toBe("Directory");
			act(() => registerNamed("live", { directory: "File Folder" }));
			// The only registered package is the one drawn.
			expect(result.current("directory")).toBe("File Folder");
		});
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

describe("icon-view layout reads --desktop-icon-*", () => {
	const theme = { desktop: { iconSize: 48 } } as ClassicyTheme;
	const container: [number, number] = [500, 500];

	afterEach(() => {
		document.getElementById("classicyDesktop")?.remove();
		vi.restoreAllMocks();
	});

	it("lays out on the desktop's --desktop-icon-cell lattice", () => {
		const desktop = document.createElement("div");
		desktop.id = "classicyDesktop";
		desktop.style.setProperty("--desktop-icon-size", "40px");
		desktop.style.setProperty("--desktop-icon-padding", "16px");
		desktop.style.setProperty("--desktop-icon-cell", "80px");
		document.body.append(desktop);
		// Pitch 80 from origin 16; floor(500 / (80 + 16)) = 5 columns, so
		// index 1 is cell (1, 0) and index 5 is cell (0, 1).
		expect(cleanupIcon(theme, 1, 6, container)).toEqual([96, 16]);
		expect(cleanupIcon(theme, 5, 6, container)).toEqual([16, 96]);
	});

	it("takes pre-read metrics without touching the DOM", () => {
		const styleRead = vi.spyOn(window, "getComputedStyle");
		const metrics = { size: 48, padding: 12, cell: 96 };
		expect(cleanupIcon(theme, 1, 6, container, undefined, metrics)).toEqual([
			108, 12,
		]);
		expect(iconGridLattice(theme, undefined, metrics)).toEqual({
			origin: [12, 12],
			pitch: [96, 96],
		});
		expect(styleRead).not.toHaveBeenCalled();
	});

	it("falls back to the theme's metrics without a desktop", () =>
		expect(readClassicyDesktopIconMetrics(theme)).toEqual({
			size: 48,
			padding: 12,
			cell: 96,
		}));
});

// Explorer's Line Up Icons and New's free cell (the remaining chapters'
// audit's A.4 and 5.40; Windows 98 SE's View ▸ Line Up Icons).
describe("classicyLineUpIconPlaces", () => {
	const pitch: [number, number] = [64, 64];
	const origin: [number, number] = [4, 4];

	it("moves each icon to its nearest cell, never left of or above the first", () => {
		expect(
			classicyLineUpIconPlaces(
				[
					[70, 10],
					[-30, -30],
					[200, 140],
				],
				pitch,
				origin,
			),
		).toEqual([
			[68, 4],
			[4, 4],
			[196, 132],
		]);
	});

	it("gives a later icon wanting a taken cell the nearest free one", () => {
		const lined = classicyLineUpIconPlaces(
			[
				[6, 6],
				[10, 8],
				[2, 70],
			],
			pitch,
			origin,
		);
		expect(lined[0]).toEqual([4, 4]);
		expect(lined[1]).toEqual([68, 4]);
		expect(lined[2]).toEqual([4, 68]);
		expect(new Set(lined.map((p) => p.join(","))).size).toBe(3);
	});
});

describe("classicyFreeIconCell", () => {
	it("returns the first cell no icon covers, within half a pitch", () => {
		const cells: [number, number][] = [
			[4, 4],
			[4, 68],
			[68, 4],
		];
		expect(classicyFreeIconCell([], cells, [64, 64])).toEqual([4, 4]);
		expect(
			classicyFreeIconCell(
				[
					[10, 10],
					[30, 80],
				],
				cells,
				[64, 64],
			),
		).toEqual([68, 4]);
		expect(
			classicyFreeIconCell(
				[
					[4, 4],
					[4, 68],
					[68, 4],
				],
				cells,
				[64, 64],
			),
		).toBeUndefined();
	});
});
