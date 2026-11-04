import path from "node:path";
import { cleanup, render, waitFor } from "@testing-library/react";
import * as sass from "sass";
import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { ClassicyFileBrowser } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

/**
 * Story 0100-a5o: how wide the file browser's fill is, per view.
 *
 * - Icon view: the icon layout measures its holder
 *   (`getBoundingClientRect().width`) to place the icons, and both the
 *   holder and the browser root are absolutely positioned with only
 *   absolutely positioned content, so without an explicit width they
 *   shrink to nothing and every icon lands at the top left. Both must span
 *   their container.
 * - List view: the root takes its table's width (b4337ba2c, 11/02). Held at
 *   the window's width instead, a table wider than the window overflows
 *   the root, and scrolling right shows the window's white contents box
 *   under the last row, where nothing takes a click or a drop.
 *
 * jsdom does no layout, so this asserts the width the compiled stylesheet
 * gives each element, through jsdom's own cascade (getComputedStyle), on the
 * DOM each view really renders: the rule is scoped by structure.
 */

let sheet: HTMLStyleElement;
beforeAll(() => {
	sheet = document.createElement("style");
	// vitest's root is the repo root, and jsdom leaves import.meta.url a
	// non-file URL, so resolve from the project root.
	sheet.textContent = sass.compile(
		path.resolve(
			process.cwd(),
			"src/SystemFolder/SystemResources/File/ClassicyFileBrowserViewTable.scss",
		),
		{ style: "expanded" },
	).css;
	document.head.appendChild(sheet);
});
afterAll(() => sheet.remove());
afterEach(cleanup);

const makeFs = (key: string) =>
	new ClassicyFileSystem(key, {
		_type: "directory",
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"apple.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/a.pdf",
			},
		},
	});

const renderBrowser = (key: string, display: "icons" | "list") =>
	render(
		<ClassicyFileBrowser
			fs={makeFs(key)}
			path="Documents"
			appId="Finder.app"
			display={display}
		/>,
	).container;

const width = (el: Element | null) => {
	if (!el) throw new Error("element not rendered");
	return getComputedStyle(el).width;
};

describe("ClassicyFileBrowser fill width by view (0100-a5o)", () => {
	it("spans the window with the icon view's root and holder", async () => {
		const container = renderBrowser("test-browser-fill-icons", "icons");
		const root = container.firstElementChild;
		await waitFor(() =>
			expect(root?.querySelector(".classicyIcon")).not.toBeNull(),
		);
		const holder = root?.querySelector(":scope > .classicyFileBrowserFill");
		expect(width(root)).toBe("100%");
		expect(width(holder ?? null)).toBe("100%");
	});

	it("leaves the list view's root to take its table's width", async () => {
		const container = renderBrowser("test-browser-fill-list", "list");
		const root = container.firstElementChild;
		await waitFor(() =>
			expect(root?.querySelector("tr.classicyTableRow")).not.toBeNull(),
		);
		expect(root?.classList.contains("classicyFileBrowserFill")).toBe(true);
		expect(width(root)).not.toBe("100%");
	});
});
