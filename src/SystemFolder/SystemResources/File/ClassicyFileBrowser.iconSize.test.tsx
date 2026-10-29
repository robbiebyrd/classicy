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
});
