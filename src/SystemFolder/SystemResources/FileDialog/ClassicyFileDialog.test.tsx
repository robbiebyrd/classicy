import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the core default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { act, render } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import { ClassicyFileDialog } from "@/SystemFolder/SystemResources/FileDialog/ClassicyFileDialog";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

// Real ClassicyWindow is used; only its external hooks are mocked so the
// modal renders (and portals to document.body) without a provider tree.
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: { Applications: { apps: {} } },
				},
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => mockPlayer }),
);

const destroyCalls = () =>
	mockDispatch.mock.calls.filter(
		(c) => (c[0] as { type: string }).type === "ClassicyWindowDestroy",
	);

describe("ClassicyFileDialog modal unmount lifecycle", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// ClassicyFileDialog is always modal={true} — ClassicyWindow's cleanup
	// effect must dispatch ClassicyWindowDestroy for it on unmount (#222/#223),
	// so reopening Open/Save takes focus rather than silently reusing a stale
	// store record.
	it("dispatches ClassicyWindowDestroy for the dialog window on unmount", () => {
		const { unmount } = render(
			<ClassicyFileDialog
				id="open-dialog"
				appId="Finder.app"
				open={true}
				mode="open"
				volumes={[]}
				onOpenFunc={() => {}}
			/>,
		);
		expect(destroyCalls()).toHaveLength(0);

		unmount();

		expect(destroyCalls()).toHaveLength(1);
		expect(destroyCalls()[0][0]).toMatchObject({
			type: "ClassicyWindowDestroy",
			app: { id: "Finder.app" },
			window: { id: "open-dialog" },
		});
	});
});

// Standard File's list keeps a fits-state vertical bar in System 7
// (`*-dialog-standardfile-open.png`, four items): the well follows the
// package's `layout.scrollBar.fitsBars`, as a list box does. jsdom lays
// nothing out, so the list always fits here.
describe("ClassicyFileDialog list bar while the items fit", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());

	const wellBars = () =>
		document.querySelectorAll<HTMLElement>(
			'.classicyFileOpenDialogWell [data-classicy-part="scrollbar"]',
		);
	const open = () =>
		render(
			<ClassicyFileDialog
				id="open-dialog"
				appId="Finder.app"
				open={true}
				mode="open"
				volumes={[]}
				onOpenFunc={() => {}}
			/>,
		);

	it("draws none by default (Mac OS 8)", () => {
		open();
		expect(wellBars()).toHaveLength(0);
	});

	it("keeps its vertical bar, fits, under a package that keeps the bars", () => {
		resetClassicyAppearancePackagesForTests();
		registerClassicyAppearancePackage({
			id: "test-fits-bars",
			name: "Fits Bars",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "test-fits-bars-default",
				package: "test-fits-bars",
			},
			layout: {
				...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				scrollBar: { fitsBars: "shown" },
			},
		});
		open();
		const bars = wellBars();
		expect(bars).toHaveLength(1);
		expect(bars[0].classList.contains("classicyScrollBarVertical")).toBe(true);
		expect(bars[0].classList.contains("fits")).toBe(true);
	});
});

// Story 0214-c61: System 7.5's Standard File box (`*-755-dialog-standardfile-
// layout.png`) shows parts Mac OS 8's does not: the disk's name and icon,
// Eject and Desktop buttons and a line between them and Cancel. The dialog
// always renders them (the base sheet hides them; a package shows them), and
// a package's layout may draw the box as a fixed modal.
describe("ClassicyFileDialog's Standard File parts", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());

	const disk = {
		id: "fs-Macintosh HD",
		label: "Macintosh HD",
		icon: "disk.png",
		list: async () => [],
	};
	const desktop = { id: "desktop", label: "Desktop", list: async () => [] };
	const open = (volumes = [disk, desktop], mode: "open" | "save" = "open") =>
		render(
			mode === "open" ? (
				<ClassicyFileDialog
					id="open-dialog"
					appId="Finder.app"
					open={true}
					mode="open"
					volumes={volumes}
					onOpenFunc={() => {}}
				/>
			) : (
				<ClassicyFileDialog
					id="open-dialog"
					appId="Finder.app"
					open={true}
					mode="save"
					volumes={volumes}
					formats={[
						{
							label: "Text",
							extension: ".txt",
							fileType: "text",
							data: () => "",
						},
					]}
					onSaveFunc={() => {}}
				/>
			),
		);
	const part = (name: string) =>
		document.querySelector<HTMLElement>(`.classicyFileOpenDialog${name}`);

	it("names the volume shown, with its icon", () => {
		open();
		const volume = part("Volume") as HTMLElement;
		expect(volume.textContent).toBe("Macintosh HD");
		expect(volume.querySelector("img")?.getAttribute("src")).toBe("disk.png");
	});

	it("draws Eject dimmed, Desktop, a line, then Cancel and Open, in that order", () => {
		open();
		const actions = part("Actions") as HTMLElement;
		expect(
			[...actions.children].map((child) =>
				child.tagName === "HR" ? "line" : child.textContent,
			),
		).toEqual(["Eject", "Desktop", "line", "Cancel", "Open"]);
		expect(part("Eject")).toBeDisabled();
		expect(part("Desktop")).toBeEnabled();
	});

	it("goes to the desktop volume on Desktop, then dims it", () => {
		open();
		(part("Desktop") as HTMLElement).click();
		return vi.waitFor(() => {
			expect(part("Volume")?.textContent).toBe("Desktop");
			expect(part("Desktop")).toBeDisabled();
		});
	});

	it("dims Desktop with no desktop volume", () => {
		open([disk]);
		expect(part("Desktop")).toBeDisabled();
	});

	it("marks the save dialog's body", () => {
		open([disk], "save");
		expect(part("Body")).toHaveClass("classicyFileDialogSaveBody");
	});

	it("is a movable modal by default, a fixed one under a package that says so", () => {
		const { unmount } = open();
		expect(document.querySelector(".classicyWindowModalFixed")).toBeNull();
		unmount();
		registerClassicyAppearancePackage({
			id: "test-fixed-file-dialog",
			name: "Fixed",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "test-fixed-file-dialog-default",
				package: "test-fixed-file-dialog",
			},
			layout: {
				...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				fileDialog: { frame: "fixed" },
			},
		});
		open();
		expect(document.querySelector(".classicyWindowModalFixed")).not.toBeNull();
	});
});

// Ruling R4: a package's `layout.fileDialog.navigation: "flat"` browses as
// System 7.5's Standard File does: the current folder's contents only, every
// row with its small icon, a folder entered by a double-click (or Open with
// it selected), and the pop-up listing the folder's path upward, each level
// by its small icon.
describe("ClassicyFileDialog's flat navigation", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());

	const flatPackage = () =>
		registerClassicyAppearancePackage({
			id: "test-flat-file-dialog",
			name: "Flat",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "test-flat-file-dialog-default",
				package: "test-flat-file-dialog",
			},
			layout: {
				...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
				fileDialog: { navigation: "flat" },
			},
		});
	const disk = {
		id: "fs-Macintosh HD",
		label: "Macintosh HD",
		icon: "disk.png",
		list: async (path: string[]) =>
			path.length === 0
				? [
						{
							id: "readme",
							name: "Read Me",
							kind: "file" as const,
							icon: "doc.png",
						},
						{ id: "extras", name: "Apple Extras", kind: "folder" as const },
					]
				: path[0] === "Apple Extras"
					? [{ id: "script", name: "AppleScript", kind: "folder" as const }]
					: [],
	};
	const rows = () =>
		[
			...document.querySelectorAll(
				".classicyFileOpenDialogWell .classicyTreeNodeLabel",
			),
		].map((el) => el.textContent);
	const row = (name: string) =>
		[
			...document.querySelectorAll<HTMLElement>(
				".classicyFileOpenDialogWell .classicyTreeNodeLabelHolder",
			),
		].find((el) => el.textContent === name) as HTMLElement;
	const popUpLabels = () =>
		document.querySelector(
			".classicyFileOpenDialogBody .classicyPopUpMenuValue",
		)?.textContent ?? "";

	it("lists the folder's own contents, every row with its icon, no triangles", async () => {
		flatPackage();
		render(
			<ClassicyFileDialog
				id="open-dialog"
				appId="Finder.app"
				open={true}
				mode="open"
				volumes={[disk]}
				onOpenFunc={() => {}}
			/>,
		);
		await vi.waitFor(() => expect(rows()).toEqual(["Read Me", "Apple Extras"]));
		expect(
			document.querySelectorAll(
				".classicyFileOpenDialogWell .classicyTreeNodeBranch",
			),
		).toHaveLength(0);
		expect(
			document.querySelectorAll(
				".classicyFileOpenDialogWell .classicyTreeNodeIcon",
			),
		).toHaveLength(2);
		expect(popUpLabels()).toBe("Macintosh HD");
	});

	it("enters a folder on double-click, and goes back up through the pop-up", async () => {
		flatPackage();
		render(
			<ClassicyFileDialog
				id="open-dialog"
				appId="Finder.app"
				open={true}
				mode="open"
				volumes={[disk]}
				onOpenFunc={() => {}}
			/>,
		);
		await vi.waitFor(() => expect(row("Apple Extras")).toBeTruthy());
		act(() => {
			row("Apple Extras").dispatchEvent(
				new MouseEvent("dblclick", { bubbles: true }),
			);
		});
		await vi.waitFor(() => expect(rows()).toEqual(["AppleScript"]));
		expect(popUpLabels()).toBe("Apple Extras");
		// The pop-up's options: the folder, then each level up, with icons.
		act(() => {
			(
				document.querySelector(
					".classicyFileOpenDialogBody .classicyPopUpMenuButton",
				) as HTMLElement
			).click();
		});
		const options = [
			...document.querySelectorAll(".classicyPopUpMenuListItem"),
		];
		expect(options.map((o) => o.textContent)).toEqual([
			"Apple Extras",
			"Macintosh HD",
		]);
		expect(
			options
				.map((o) => o.querySelector("img")?.getAttribute("src") ?? null)
				.every(Boolean),
		).toBe(true);
		act(() => {
			(options[1] as HTMLElement).click();
		});
		await vi.waitFor(() => expect(rows()).toEqual(["Read Me", "Apple Extras"]));
	});

	it("opens a selected folder with Open, and hands a selected file to onOpenFunc", async () => {
		flatPackage();
		const onOpen = vi.fn();
		render(
			<ClassicyFileDialog
				id="open-dialog"
				appId="Finder.app"
				open={true}
				mode="open"
				volumes={[disk]}
				onOpenFunc={onOpen}
			/>,
		);
		await vi.waitFor(() => expect(row("Apple Extras")).toBeTruthy());
		const openButton = () =>
			[...document.querySelectorAll<HTMLButtonElement>("button")].find(
				(b) => b.textContent === "Open",
			) as HTMLButtonElement;
		act(() => row("Apple Extras").click());
		expect(openButton()).toBeEnabled();
		act(() => openButton().click());
		await vi.waitFor(() => expect(rows()).toEqual(["AppleScript"]));
		expect(onOpen).not.toHaveBeenCalled();
		act(() => {
			(
				document.querySelector(
					".classicyFileOpenDialogBody .classicyPopUpMenuButton",
				) as HTMLElement
			).click();
		});
		act(() => {
			(
				document.querySelectorAll(
					".classicyPopUpMenuListItem",
				)[1] as HTMLElement
			).click();
		});
		await vi.waitFor(() => expect(row("Read Me")).toBeTruthy());
		act(() => row("Read Me").click());
		act(() => openButton().click());
		expect(onOpen).toHaveBeenCalledWith([
			expect.objectContaining({
				path: [],
				entry: expect.objectContaining({ name: "Read Me" }),
			}),
		]);
	});
});
