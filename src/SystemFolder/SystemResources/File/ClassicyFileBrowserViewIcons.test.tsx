import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import type { FinderIconViewOptions } from "@/SystemFolder/Finder/FinderContext";
import { ClassicyFileBrowserViewIcons } from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserViewIcons";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";
import { ClassicyFileSystemEntryFileType } from "@/SystemFolder/SystemResources/File/ClassicyFileSystemModel";

// Deliberately NOT alphabetical, so listing order and sorted order differ.
const makeFs = (key: string) =>
	new ClassicyFileSystem(key, {
		_type: "directory",
		Documents: {
			_type: ClassicyFileSystemEntryFileType.Directory,
			"zebra.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/z.pdf",
			},
			"apple.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/a.pdf",
			},
			"mango.pdf": {
				_type: ClassicyFileSystemEntryFileType.Pdf,
				_url: "https://example.com/m.pdf",
			},
		},
	});

// Ruling 4: the parameter is typed as FinderIconViewOptions (imported from
// FinderContext) rather than `typeof ICONS_BASE` — ICONS_BASE.arrangement is
// `"none" as const`, so a spread that overrides it to `"sorted"` would not
// typecheck against that narrower type.
const ICONS_BASE: FinderIconViewOptions = {
	arrangement: "none",
	keepArrangedBy: "name",
	iconSize: "large",
};

const renderIcons = (key: string, iconViewOptions?: FinderIconViewOptions) =>
	render(
		<ClassicyAppManagerProvider>
			<ClassicyFileBrowserViewIcons
				fs={makeFs(key)}
				path="Documents"
				appId="Finder.app"
				iconViewOptions={iconViewOptions}
			/>
		</ClassicyAppManagerProvider>,
	);

// ClassicyIcon renders `<img src={icon} alt={name} />`; a native <img> with
// non-empty alt text carries the implicit ARIA role "img", so
// getAllByRole("img") finds exactly the icon images in document order.
// Confirmed directly against ClassicyIcon.tsx before relying on it here.
const renderedNames = (): string[] =>
	screen
		.getAllByRole("img")
		.map((img) => img.getAttribute("alt") ?? "")
		.filter((name) => name.length > 0);

// Every size-driven rule in ClassicyIcon.scss (the container, the mask, the
// mask outer, and the <img> itself) reads --desktop-icon-size from the
// outermost ".classicyIcon" element, so that is the element an override has
// to land on to have any visual effect — a width/height attribute on the
// <img> is inert because the CSS declarations on it always win over HTML
// presentational attributes.
const firstIconRoot = (): HTMLElement =>
	screen.getAllByRole("img")[0].closest(".classicyIcon") as HTMLElement;

describe("ClassicyFileBrowserViewIcons arrangement", () => {
	it("keeps listing order when the arrangement is none", () => {
		renderIcons("test-icons-none", ICONS_BASE);
		expect(renderedNames()).toEqual(["zebra.pdf", "apple.pdf", "mango.pdf"]);
	});

	it("sorts by name when the arrangement is sorted", () => {
		renderIcons("test-icons-sorted", {
			...ICONS_BASE,
			arrangement: "sorted",
		});
		expect(renderedNames()).toEqual(["apple.pdf", "mango.pdf", "zebra.pdf"]);
	});

	it("keeps listing order when no options are passed at all", () => {
		renderIcons("test-icons-default");
		expect(renderedNames()).toEqual(["zebra.pdf", "apple.pdf", "mango.pdf"]);
	});

	it("sets --desktop-icon-size from the theme base and the chosen step", () => {
		renderIcons("test-icons-small", { ...ICONS_BASE, iconSize: "small" });
		// 0.5 x the 48px theme base.
		expect(firstIconRoot().style.getPropertyValue("--desktop-icon-size")).toBe(
			"24px",
		);
	});

	it("scales the custom property differently for the small and large steps", () => {
		renderIcons("test-icons-large", { ...ICONS_BASE, iconSize: "large" });
		const large = firstIconRoot().style.getPropertyValue("--desktop-icon-size");
		expect(large).toBe("48px");
		expect(large).not.toBe("24px");
	});

	it("leaves --desktop-icon-size unset when no options are passed", () => {
		renderIcons("test-icons-default");
		expect(firstIconRoot().style.getPropertyValue("--desktop-icon-size")).toBe(
			"",
		);
	});

	it("does not enter the dragging state when locked", () => {
		renderIcons("test-icons-locked", {
			...ICONS_BASE,
			arrangement: "sorted",
		});
		const icon = screen.getAllByRole("img")[0].closest("div");
		fireEvent.mouseDown(icon as HTMLElement);
		expect(icon?.className).not.toContain("classicyIconDragging");
	});

	it("re-lays-out an already-mounted component when the arrangement option changes", () => {
		// Same `fs` instance reused across both renders below (not a fresh
		// makeFs() call per render) — every other prop is held identical too,
		// so `iconViewOptions` is the only thing that changes between them.
		// This isolates the dependency-array trap: if the effect's deps list
		// omitted the option primitives, `fs` (and everything else) staying
		// referentially the same would mean the effect simply would not
		// re-run, and the assertion below would still see the pre-rerender
		// (unsorted) order.
		const fs = makeFs("test-icons-rerender");

		const { rerender } = render(
			<ClassicyAppManagerProvider>
				<ClassicyFileBrowserViewIcons
					fs={fs}
					path="Documents"
					appId="Finder.app"
					iconViewOptions={ICONS_BASE}
				/>
			</ClassicyAppManagerProvider>,
		);
		expect(renderedNames()).toEqual(["zebra.pdf", "apple.pdf", "mango.pdf"]);

		rerender(
			<ClassicyAppManagerProvider>
				<ClassicyFileBrowserViewIcons
					fs={fs}
					path="Documents"
					appId="Finder.app"
					iconViewOptions={{ ...ICONS_BASE, arrangement: "sorted" }}
				/>
			</ClassicyAppManagerProvider>,
		);
		expect(renderedNames()).toEqual(["apple.pdf", "mango.pdf", "zebra.pdf"]);
	});
});
