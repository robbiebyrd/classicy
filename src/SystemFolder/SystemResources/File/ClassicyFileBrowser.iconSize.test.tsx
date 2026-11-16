// jsdom's getComputedStyle reports inline custom properties set with
// `style.setProperty`, so these tests mount a real #classicyDesktop carrying
// --desktop-icon-size; no getComputedStyle stub is needed.
import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { FinderListViewOptionsSchema } from "@/SystemFolder/Finder/FinderContext";
import { ClassicyFileBrowser } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowser";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

afterEach(() => {
	cleanup();
	document.getElementById("classicyDesktop")?.remove();
});

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

const renderList = (key: string) =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyFileBrowser
				fs={makeFs(key)}
				path="Documents"
				appId="Finder.app"
				display="list"
				listViewOptions={FinderListViewOptionsSchema.parse({
					iconSize: "large",
				})}
			/>
		</ClassicyAppManagerProvider>,
	);

const rowIconWidth = async (container: HTMLElement) => {
	await waitFor(() =>
		expect(
			container.querySelector("img.classicyFileBrowserViewTableRowIcon"),
		).not.toBeNull(),
	);
	return container
		.querySelector("img.classicyFileBrowserViewTableRowIcon")
		?.getAttribute("width");
};

describe("ClassicyFileBrowser list-view icon base", () => {
	it("scales from the theme's icon size without a desktop", async () => {
		const { container } = renderList("test-browser-list-theme");
		// round(48 * 0.667) = 32.
		expect(await rowIconWidth(container)).toBe("32");
	});

	it("scales from the desktop's --desktop-icon-size", async () => {
		const desktop = document.createElement("div");
		desktop.id = "classicyDesktop";
		desktop.style.setProperty("--desktop-icon-size", "64px");
		document.body.append(desktop);
		const { container } = renderList("test-browser-list-desktop");
		// round(64 * 0.667) = 43.
		expect(await rowIconWidth(container)).toBe("43");
	});

	// An Appearance Package may give a step its own size (the measurement
	// family `fileBrowserList`, emitted on the desktop): System 7 draws its
	// 16 px small icons at 16, which no scale of its 32 px base gives.
	it("draws the step at the package's own size when the desktop carries one", async () => {
		const desktop = document.createElement("div");
		desktop.id = "classicyDesktop";
		desktop.style.setProperty("--desktop-icon-size", "64px");
		desktop.style.setProperty("--file-browser-list-large-icon-size", "30px");
		document.body.append(desktop);
		const { container } = renderList("test-browser-list-package-size");
		expect(await rowIconWidth(container)).toBe("30");
	});

	it("keeps the scaled size for a step the package gives no size, or 0", async () => {
		const desktop = document.createElement("div");
		desktop.id = "classicyDesktop";
		desktop.style.setProperty("--desktop-icon-size", "64px");
		desktop.style.setProperty("--file-browser-list-medium-icon-size", "16px");
		desktop.style.setProperty("--file-browser-list-large-icon-size", "0px");
		document.body.append(desktop);
		const { container } = renderList("test-browser-list-other-step");
		expect(await rowIconWidth(container)).toBe("43");
	});
});
