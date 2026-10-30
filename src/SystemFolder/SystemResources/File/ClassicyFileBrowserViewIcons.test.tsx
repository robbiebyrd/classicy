import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
		// is div.classicyIconMask, but "dragging" is only ever applied
		// to the root div.classicyIcon. Asserting on the mask made this pass for
		// every possible implementation — including one with no locking at all.
		const icon = firstIconRoot();
		fireEvent.mouseDown(icon);
		expect(icon).not.toHaveClass("dragging");
	});

	it("drags an outline, not the icon, once the pointer has moved", () => {
		// The counterweight to the assertion above: an unlocked icon in a file
		// browser drags as a file — a dotted outline in a body-level ghost that
		// can leave the window — while the icon itself stays where it is.
		renderIcons("test-icons-unlocked", ICONS_BASE);
		const icon = firstIconRoot();
		const left = icon.style.left;
		fireEvent.mouseDown(icon, { button: 0, clientX: 0, clientY: 0 });
		fireEvent.mouseMove(document, { clientX: 40, clientY: 40 });
		expect(document.querySelector(".classicyFileDragGhost")).not.toBeNull();
		expect(document.body).toHaveClass("classicyFileDragging");
		expect(icon.style.left).toBe(left);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(document.querySelector(".classicyFileDragGhost")).toBeNull();
	});

	// jsdom has no layout engine and no elementsFromPoint. These give every
	// element a 400 px box — so the layout has columns to place icons in (a
	// zero-width holder lays them out at NaN) — and drop the outline back on its
	// own folder by stubbing the hit-test to the folder's drop element. Dropped
	// in place, an icon moves as far as the pointer did, from where it was
	// laid out.
	const withLayout = () =>
		vi
			.spyOn(HTMLElement.prototype, "getBoundingClientRect")
			.mockReturnValue(new DOMRect(0, 0, 400, 400));
	afterEach(() => {
		vi.restoreAllMocks();
	});

	const dragWithinFolder = (icon: HTMLElement, to: [number, number]) => {
		const folder = document.createElement("div");
		folder.setAttribute("data-classicy-drop-folder", "Documents");
		const original = document.elementsFromPoint;
		document.elementsFromPoint = () => [folder];
		try {
			fireEvent.mouseDown(icon, { button: 0, clientX: 0, clientY: 0 });
			fireEvent.mouseMove(document, { clientX: to[0], clientY: to[1] });
			fireEvent.mouseUp(document, { clientX: to[0], clientY: to[1] });
		} finally {
			document.elementsFromPoint = original;
		}
	};

	it("snaps a dragged icon onto the lattice the layout uses", () => {
		withLayout();
		renderIcons("test-icons-grid", { ...ICONS_BASE, arrangement: "grid" });
		const icon = firstIconRoot();
		// Laid out in cell (0, 0): theme base 48 → padding 12.
		expect(icon.style.left).toBe("12px");

		dragWithinFolder(icon, [140, 140]);

		// 12 + 140 = 152 → cell 96 from origin 12 → cell (1, 1) at 12 + 96 = 108,
		// exactly where cleanupIcon lays out that cell. A snap with pitch 48 and
		// origin 0 would have produced 144 — a half-row the layout never uses.
		expect(icon.style.left).toBe("108px");
		expect(icon.style.top).toBe("108px");
	});

	it("snaps small icons onto the smaller lattice", () => {
		withLayout();
		renderIcons("test-icons-grid-small", {
			...ICONS_BASE,
			arrangement: "grid",
			iconSize: "small",
		});
		const icon = firstIconRoot();
		expect(icon.style.left).toBe("12px");

		dragWithinFolder(icon, [70, 70]);

		// 0.5 x 48 = 24 → cell 48, origin still the theme's 12: 12 + 70 = 82
		// rounds to 12 + 48 = 60.
		expect(icon.style.left).toBe("60px");
		expect(icon.style.top).toBe("60px");
	});

	it("does not snap when the arrangement is not grid", () => {
		withLayout();
		renderIcons("test-icons-nogrid", ICONS_BASE);
		const icon = firstIconRoot();
		expect(icon.style.left).toBe("12px");

		dragWithinFolder(icon, [140, 140]);

		expect(icon.style.left).toBe("152px");
		expect(icon.style.top).toBe("152px");
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

describe("ClassicyFileBrowserViewIcons reads --desktop-icon-*", () => {
	afterEach(() => {
		document.getElementById("classicyDesktop")?.remove();
		vi.restoreAllMocks();
	});

	const mountDesktop = () => {
		const desktop = document.createElement("div");
		desktop.id = "classicyDesktop";
		desktop.style.setProperty("--desktop-icon-size", "64px");
		desktop.style.setProperty("--desktop-icon-padding", "16px");
		desktop.style.setProperty("--desktop-icon-cell", "128px");
		document.body.append(desktop);
	};

	it("scales the size step from the desktop's --desktop-icon-size", () => {
		mountDesktop();
		renderIcons("test-icons-desktop-vars", {
			...ICONS_BASE,
			iconSize: "small",
		});
		// 0.5 x the desktop's 64px, not the theme's 48px.
		expect(firstIconRoot().style.getPropertyValue("--desktop-icon-size")).toBe(
			"32px",
		);
	});

	it("reads the variables once per theme, not per icon or per re-layout", () => {
		mountDesktop();
		const read = vi.spyOn(CSSStyleDeclaration.prototype, "getPropertyValue");
		const desktopIconReads = () =>
			read.mock.calls.filter(([name]) => name.startsWith("--desktop-icon-"))
				.length;
		const ui = (fs: ClassicyFileSystem) => (
			<ClassicyAppManagerProvider>
				<ClassicyFileBrowserViewIcons
					fs={fs}
					path="Documents"
					appId="Finder.app"
					iconViewOptions={ICONS_BASE}
				/>
			</ClassicyAppManagerProvider>
		);
		const { rerender } = render(ui(makeFs("test-icons-read-once")));
		// Three icons laid out: size, padding and cell, once each.
		expect(desktopIconReads()).toBe(3);
		// A new file-system identity re-runs the layout effect; the theme is
		// unchanged, so nothing is read again.
		rerender(ui(makeFs("test-icons-read-once-2")));
		expect(desktopIconReads()).toBe(3);
	});
});
