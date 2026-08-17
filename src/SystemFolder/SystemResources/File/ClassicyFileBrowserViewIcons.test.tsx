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
		// firstIconRoot(), not `.closest("div")`: the <img>'s nearest div ancestor
		// is div.classicyIconMask, but "classicyIconDragging" is only ever applied
		// to the root div.classicyIcon. Asserting on the mask made this pass for
		// every possible implementation — including one with no locking at all.
		const icon = firstIconRoot();
		fireEvent.mouseDown(icon);
		expect(icon.className).not.toContain("classicyIconDragging");
	});

	it("does enter the dragging state when not locked", () => {
		// The counterweight to the assertion above: without this, a root-level
		// assertion would still pass if the class simply never appeared.
		renderIcons("test-icons-unlocked", ICONS_BASE);
		const icon = firstIconRoot();
		fireEvent.mouseDown(icon);
		expect(icon.className).toContain("classicyIconDragging");
	});

	// jsdom has no layout engine, so every getBoundingClientRect() is zeros:
	// ClassicyIcon's drag math reduces to position = [clientX, clientY], and the
	// assertions below read the inline style the component itself sets rather
	// than any computed geometry.
	it("snaps a dragged icon onto the lattice the layout uses", () => {
		renderIcons("test-icons-grid", { ...ICONS_BASE, arrangement: "grid" });
		const icon = firstIconRoot();

		fireEvent.mouseDown(icon);
		fireEvent.mouseMove(icon, { clientX: 140, clientY: 140 });
		fireEvent.mouseUp(icon);

		// Theme base 48 → padding 12, cell 96. Cell (1, 1) is at 12 + 96 = 108,
		// exactly where cleanupIcon lays out that cell. The pre-fix snap (pitch
		// 48, origin 0) would have produced 144 — a half-row the layout never
		// uses, overlapping the row above.
		expect(icon.style.left).toBe("108px");
		expect(icon.style.top).toBe("108px");
	});

	it("snaps small icons onto the smaller lattice", () => {
		renderIcons("test-icons-grid-small", {
			...ICONS_BASE,
			arrangement: "grid",
			iconSize: "small",
		});
		const icon = firstIconRoot();

		fireEvent.mouseDown(icon);
		fireEvent.mouseMove(icon, { clientX: 70, clientY: 70 });
		fireEvent.mouseUp(icon);

		// 0.5 x 48 = 24 → cell 48, origin still the theme's 12: 12 + 48 = 60.
		expect(icon.style.left).toBe("60px");
		expect(icon.style.top).toBe("60px");
	});

	it("does not snap when the arrangement is not grid", () => {
		renderIcons("test-icons-nogrid", ICONS_BASE);
		const icon = firstIconRoot();

		fireEvent.mouseDown(icon);
		fireEvent.mouseMove(icon, { clientX: 140, clientY: 140 });
		fireEvent.mouseUp(icon);

		expect(icon.style.left).toBe("140px");
		expect(icon.style.top).toBe("140px");
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
