import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// Registers Platinum's sound pack, which the core default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { registerClassicySystemArt } from "@/Appearance/ClassicyAssetRegistry";
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

	// Review r1 item 4: the New Folder button's label is "New", a noun part
	// ("Folder") and a folder-glyph part the base sheet hides; a package may
	// hide the noun and show the glyph (System 7's "New" and a folder). Its
	// accessible name stays "New Folder".
	it("labels New Folder as New, a noun part and a glyph part", () => {
		open([disk], "save");
		const button = [...document.querySelectorAll("button")].find(
			(b) => b.getAttribute("aria-label") === "New Folder",
		) as HTMLButtonElement;
		expect(button).toBeTruthy();
		expect(button.textContent).toBe("New Folder");
		expect(
			button.querySelector(".classicyFileDialogNewNoun")?.textContent,
		).toBe(" Folder");
		expect(button.querySelector(".classicyFileDialogNewGlyph")).toHaveAttribute(
			"aria-hidden",
			"true",
		);
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

	// Review r1 item 3: the pop-up's current level draws the package's open
	// folder (`openFolderIcon` system art) when it registers one.
	it("draws the package's open folder for the folder shown", async () => {
		flatPackage();
		// The store-free test resolves assets through the default package.
		registerClassicySystemArt("platinum", {
			openFolderIcon: "open-folder.png",
		});
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
		await vi.waitFor(() => expect(popUpLabels()).toBe("Apple Extras"));
		expect(
			document
				.querySelector(
					".classicyFileOpenDialogBody .classicyPopUpMenuValueIcon",
				)
				?.getAttribute("src"),
		).toBe("open-folder.png");
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

	// Review r1 items 5 and 6.
	const buttonNamed = (name: string) =>
		[...document.querySelectorAll<HTMLButtonElement>("button")].find(
			(b) => b.textContent === name || b.getAttribute("aria-label") === name,
		);
	const pressEnter = (target: Element) =>
		act(() => {
			target.dispatchEvent(
				new KeyboardEvent("keydown", { key: "Enter", bubbles: true }),
			);
		});

	it("enters a selected folder on Enter", async () => {
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
		act(() => row("Apple Extras").click());
		pressEnter(row("Apple Extras"));
		await vi.waitFor(() => expect(rows()).toEqual(["AppleScript"]));
	});

	const writable = () => {
		const write = vi.fn(async () => {});
		const mkDir = vi.fn(async () => {});
		return { volume: { ...disk, write, mkDir }, write, mkDir };
	};
	const saveDialog = (volume: typeof disk) =>
		render(
			<ClassicyFileDialog
				id="save-dialog"
				appId="Finder.app"
				open={true}
				mode="save"
				volumes={[volume]}
				defaultFileName="Notes"
				formats={[
					{
						label: "Text",
						extension: ".txt",
						fileType: "text",
						data: () => "hi",
					},
				]}
				onSaveFunc={() => {}}
			/>,
		);

	it("saves into the folder shown", async () => {
		flatPackage();
		const { volume, write } = writable();
		saveDialog(volume);
		await vi.waitFor(() => expect(row("Apple Extras")).toBeTruthy());
		act(() => {
			row("Apple Extras").dispatchEvent(
				new MouseEvent("dblclick", { bubbles: true }),
			);
		});
		await vi.waitFor(() => expect(rows()).toEqual(["AppleScript"]));
		act(() => buttonNamed("Save")?.click());
		await vi.waitFor(() =>
			expect(write).toHaveBeenCalledWith(
				["Apple Extras"],
				"Notes.txt",
				expect.anything(),
				expect.anything(),
			),
		);
	});

	it("turns Save into Open while a folder is selected, which enters it (and so does Enter)", async () => {
		flatPackage();
		const { volume, write } = writable();
		saveDialog(volume);
		await vi.waitFor(() => expect(row("Apple Extras")).toBeTruthy());
		expect(buttonNamed("Save")).toBeTruthy();
		act(() => row("Apple Extras").click());
		expect(buttonNamed("Save")).toBeUndefined();
		act(() => buttonNamed("Open")?.click());
		await vi.waitFor(() => expect(rows()).toEqual(["AppleScript"]));
		expect(write).not.toHaveBeenCalled();
		expect(buttonNamed("Save")).toBeTruthy();
		act(() => row("AppleScript").click());
		expect(buttonNamed("Open")).toBeTruthy();
		pressEnter(row("AppleScript"));
		await vi.waitFor(() => expect(popUpLabels()).toBe("AppleScript"));
		expect(write).not.toHaveBeenCalled();
	});

	// Review r2 Minor: 7.5's name field takes the default button back. A
	// folder selected, focusing the name field (or typing in it) deselects
	// the list, so the button reads Save and Enter saves into the folder
	// shown.
	it("deselects the list when the name field takes focus or changes, so Enter saves", async () => {
		flatPackage();
		const { volume, write } = writable();
		saveDialog(volume);
		await vi.waitFor(() => expect(row("Apple Extras")).toBeTruthy());
		const name = document.querySelector(
			".classicyFileDialogNameRow input",
		) as HTMLInputElement;
		act(() => row("Apple Extras").click());
		expect(buttonNamed("Open")).toBeTruthy();
		act(() => name.focus());
		expect(buttonNamed("Save")).toBeTruthy();
		act(() => row("Apple Extras").click());
		expect(buttonNamed("Open")).toBeTruthy();
		fireEvent.change(name, { target: { value: "Letter" } });
		expect(buttonNamed("Save")).toBeTruthy();
		pressEnter(name);
		await vi.waitFor(() =>
			expect(write).toHaveBeenCalledWith(
				[],
				"Letter.txt",
				expect.anything(),
				expect.anything(),
			),
		);
		expect(rows()).toEqual(["Read Me", "Apple Extras"]);
	});

	it("enters the folder New Folder creates", async () => {
		flatPackage();
		const { volume, mkDir } = writable();
		saveDialog(volume);
		await vi.waitFor(() => expect(row("Apple Extras")).toBeTruthy());
		act(() => buttonNamed("New Folder")?.click());
		const field = await vi.waitFor(() => {
			const input = document.querySelector<HTMLInputElement>(
				'[id="save-dialog-new-folder"] input, .classicyInputDialogBody input',
			);
			expect(input).not.toBeNull();
			return input as HTMLInputElement;
		});
		act(() => {
			fireEvent.change(field, { target: { value: "Letters" } });
		});
		act(() => buttonNamed("Create")?.click());
		await vi.waitFor(() => expect(mkDir).toHaveBeenCalledWith([], "Letters"));
		await vi.waitFor(() =>
			expect(
				document.querySelector(
					".classicyFileOpenDialogBody .classicyPopUpMenuValue",
				)?.textContent,
			).toBe("Letters"),
		);
	});

	it("shows the error row for a folder that fails to load, and still goes up", async () => {
		flatPackage();
		const failing = {
			...disk,
			list: async (path: string[]) => {
				if (path.length > 0) throw new Error("unreadable");
				return disk.list(path);
			},
		};
		render(
			<ClassicyFileDialog
				id="open-dialog"
				appId="Finder.app"
				open={true}
				mode="open"
				volumes={[failing]}
				onOpenFunc={() => {}}
			/>,
		);
		await vi.waitFor(() => expect(row("Apple Extras")).toBeTruthy());
		act(() => {
			row("Apple Extras").dispatchEvent(
				new MouseEvent("dblclick", { bubbles: true }),
			);
		});
		await vi.waitFor(() =>
			expect(rows()).toEqual(["Couldn't open this folder"]),
		);
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
		await vi.waitFor(() => expect(rows()).toEqual(["Read Me", "Apple Extras"]));
	});
});

// Story 0217-etx: System 7.5's Save box opens with its default name selected
// (`*-dialog-standardfile-save.png`) under a package whose layout says so
// (`fileDialog.saveName: "selected"`), and its list draws the package's own
// folder (`fileDialogFolderIcon` system art) for a folder row.
describe("ClassicyFileDialog under System 7.5's Standard File declarations", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());

	const standardFilePackage = (
		fileDialog: NonNullable<
			typeof CLASSICY_DEFAULT_APPEARANCE_LAYOUT.fileDialog
		>,
	) =>
		registerClassicyAppearancePackage({
			id: "test-standard-file",
			name: "Standard File",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "test-standard-file-default",
				package: "test-standard-file",
			},
			layout: { ...CLASSICY_DEFAULT_APPEARANCE_LAYOUT, fileDialog },
		});
	const disk = {
		id: "fs-Macintosh HD",
		label: "Macintosh HD",
		list: async () => [
			{ id: "extras", name: "Apple Extras", kind: "folder" as const },
		],
	};
	const saveDialog = () =>
		render(
			<ClassicyFileDialog
				id="save-dialog"
				appId="Finder.app"
				open={true}
				mode="save"
				volumes={[disk]}
				defaultFileName="untitled 1"
				formats={[
					{
						label: "Text",
						extension: "",
						fileType: "text",
						data: () => "",
					},
				]}
				onSaveFunc={() => {}}
			/>,
		);
	const nameField = () =>
		document.querySelector<HTMLInputElement>(
			".classicyFileDialogNameRow input",
		) as HTMLInputElement;

	it("opens the Save box with its name field focused and the default name selected", async () => {
		standardFilePackage({ saveName: "selected" });
		saveDialog();
		await vi.waitFor(() => {
			expect(document.activeElement).toBe(nameField());
			expect(nameField().value).toBe("untitled 1");
			expect([nameField().selectionStart, nameField().selectionEnd]).toEqual([
				0, 10,
			]);
		});
		// The field reports its whole text selected (the `selected` state).
		await vi.waitFor(() =>
			expect(nameField().classList.contains("selected")).toBe(true),
		);
	});

	it("leaves the name unselected without the declaration (Mac OS 8)", async () => {
		standardFilePackage({});
		saveDialog();
		await vi.waitFor(() => expect(nameField()?.value).toBe("untitled 1"));
		expect(document.activeElement).not.toBe(nameField());
		expect(nameField().classList.contains("selected")).toBe(false);
	});

	it("draws a flat list's folders with the package's list folder when it registers one", async () => {
		standardFilePackage({ navigation: "flat" });
		// The store-free test resolves assets through the default package.
		registerClassicySystemArt("platinum", {
			fileDialogFolderIcon: "list-folder.png",
		});
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
		await vi.waitFor(() =>
			expect(
				document
					.querySelector(".classicyFileOpenDialogWell .classicyTreeNodeIcon")
					?.getAttribute("src"),
			).toBe("list-folder.png"),
		);
	});
});
