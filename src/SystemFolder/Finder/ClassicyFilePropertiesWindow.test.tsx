import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	CLASSICY_PROPERTIES_HIDDEN_HELP,
	CLASSICY_PROPERTIES_READ_ONLY_HELP,
	ClassicyFilePropertiesWindow,
} from "@/SystemFolder/Finder/ClassicyFilePropertiesWindow";
import { classicyHelpAnchorConfig } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";
// Finder's reducer, which the sheet's close and a rename's PathsMoved reach.
import "@/SystemFolder/Finder/FinderContext";
import { classicyPropertiesSize } from "@/SystemFolder/SystemResources/File/ClassicyFileProperties";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

// The remaining chapters' audit's 2.2 / 5.27 (WIG Ch.2 "Putting Theory into
// Practice", pp.12-13; Ch.5 "Properties", p.51; Windows 98 SE's General
// pages, shell32.dll): the property sheet's General page, its Apply, OK and
// Cancel.

const DOCS = "Macintosh HD:Documents";
const NOTES = `${DOCS}:Notes.txt`;

const sheets = () =>
	(
		useAppManager.getState().System.Manager.Applications.apps["Finder.app"]
			?.data as { properties?: { key: string }[] }
	)?.properties ?? [];

const openSheet = (paths: string[]) =>
	act(() => dispatch({ type: "ClassicyAppFinderPropertiesOpen", paths }));

let restore: (() => void) | null = null;

beforeEach(() => {
	localStorage.clear();
	useAppManager.setState(DefaultAppManagerState, true);
});
afterEach(() => {
	cleanup();
	restore?.();
	restore = null;
});

const seed = () => {
	const fs = new ClassicyFileSystem();
	fs.mkDir(`${DOCS}:Projects`);
	fs.writeFile(`${DOCS}:Projects:plan.txt`, "plan");
	fs.writeFile(NOTES, "hello");
	fs.setMetadata(NOTES, {
		_createdOn: new Date(2026, 10, 25, 13, 4, 5),
		_modifiedOn: new Date(2026, 10, 26, 9, 0, 0),
	});
	return fs;
};

const rowValue = (label: string) =>
	screen.getByText(label, { selector: ".classicyFilePropertiesLabel" })
		.nextElementSibling?.textContent;

describe("ClassicyFilePropertiesWindow", () => {
	it("shows a file's General page: name, type, location, size, dates, attributes", async () => {
		const fs = seed();
		openSheet([NOTES]);
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={[NOTES]}
			/>,
		);
		expect(screen.getByText("Notes.txt Properties")).toBeInTheDocument();
		expect(screen.getByRole("tab", { name: "General" })).toBeInTheDocument();
		expect(screen.getByDisplayValue("Notes.txt")).toBeInTheDocument();
		expect(rowValue("Type:")).toBe("Text file");
		expect(rowValue("Location:")).toBe(DOCS);
		expect(await screen.findByText("5 bytes")).toBeInTheDocument();
		expect(rowValue("Created:")).toBe(
			"Wednesday, November 25, 2026 1:04:05 PM",
		);
		expect(rowValue("Modified:")).toBe(
			"Thursday, November 26, 2026 9:00:00 AM",
		);
		expect(
			screen.getByRole("checkbox", { name: "Read-only" }),
		).not.toBeChecked();
		expect(screen.getByRole("checkbox", { name: "Hidden" })).not.toBeChecked();
		expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
	});

	it("writes the attributes on Apply, which stays dimmed until something changes", async () => {
		const fs = seed();
		openSheet([NOTES]);
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={[NOTES]}
			/>,
		);
		const user = userEvent.setup();
		await user.click(screen.getByRole("checkbox", { name: "Read-only" }));
		await user.click(screen.getByRole("checkbox", { name: "Hidden" }));
		const apply = screen.getByRole("button", { name: "Apply" });
		expect(apply).toBeEnabled();
		await user.click(apply);
		expect(fs.resolve(NOTES)._readOnly).toBe(true);
		expect(fs.resolve(NOTES)._invisible).toBe(true);
		// Apply keeps the sheet open.
		expect(sheets()).toHaveLength(1);
	});

	it("gives the keyboard to its General tab, so ESC cancels at once", () => {
		const fs = seed();
		openSheet([NOTES]);
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={[NOTES]}
			/>,
		);
		const tab = screen.getByRole("tab", { name: "General" });
		expect(document.activeElement).toBe(tab);
		fireEvent.keyDown(tab, { key: "Escape" });
		expect(sheets()).toEqual([]);
	});

	it("describes its attributes for What's This?", () => {
		const fs = seed();
		openSheet([NOTES]);
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={[NOTES]}
			/>,
		);
		const holder = (name: string) =>
			screen
				.getByRole("checkbox", { name })
				.closest(".classicyCheckboxHolder") as Element;
		expect(classicyHelpAnchorConfig(holder("Read-only"))).toEqual({
			content: CLASSICY_PROPERTIES_READ_ONLY_HELP,
		});
		expect(classicyHelpAnchorConfig(holder("Hidden"))).toEqual({
			content: CLASSICY_PROPERTIES_HIDDEN_HELP,
		});
	});

	it("closes on Cancel without writing, and on OK after writing", async () => {
		const fs = seed();
		openSheet([NOTES]);
		const { unmount } = render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={[NOTES]}
			/>,
		);
		const user = userEvent.setup();
		await user.click(screen.getByRole("checkbox", { name: "Read-only" }));
		await user.click(screen.getByRole("button", { name: "Cancel" }));
		expect(sheets()).toEqual([]);
		expect(fs.resolve(NOTES)._readOnly).toBeUndefined();
		unmount();
		openSheet([NOTES]);
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={[NOTES]}
			/>,
		);
		await user.click(screen.getByRole("checkbox", { name: "Hidden" }));
		await user.click(screen.getByRole("button", { name: "OK" }));
		expect(fs.resolve(NOTES)._invisible).toBe(true);
		expect(sheets()).toEqual([]);
	});

	it("renames through its name field, the sheet following the item", async () => {
		const fs = seed();
		openSheet([NOTES]);
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={[NOTES]}
			/>,
		);
		const name = screen.getByDisplayValue("Notes.txt");
		fireEvent.change(name, { target: { value: "Plans.txt" } });
		fireEvent.click(screen.getByRole("button", { name: "Apply" }));
		expect(fs.resolve(`${DOCS}:Plans.txt`)).toBeDefined();
		expect(fs.resolve(NOTES)).toBeUndefined();
		expect(sheets()).toEqual([
			{ key: `${DOCS}:Plans.txt`, paths: [`${DOCS}:Plans.txt`] },
		]);
	});

	it("shows a folder's contents and no Modified, a drive's used space and no attributes", async () => {
		const fs = seed();
		const folder = `${DOCS}:Projects`;
		openSheet([folder]);
		const { unmount } = render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={[folder]}
			/>,
		);
		expect(rowValue("Type:")).toBe("Directory");
		expect(rowValue("Contains:")).toBe("1 Files, 0 Folders");
		expect(screen.queryByText("Modified:")).toBeNull();
		expect(rowValue("Created:")).toBeDefined();
		unmount();
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={["Macintosh HD"]}
			/>,
		);
		expect(screen.getByText("Macintosh HD Properties")).toBeInTheDocument();
		expect(rowValue("Type:")).toBe("Drive");
		// The space its items use, summed all the way down as a folder's is.
		const used = classicyPropertiesSize(
			await fs.calculateSizeDir("Macintosh HD"),
		);
		expect(
			await screen.findByText(used, {
				selector: ".classicyFilePropertiesValue",
			}),
		).toBeInTheDocument();
		expect(rowValue("Used space:")).toBe(used);
		expect(screen.queryByText("Location:")).toBeNull();
		expect(screen.queryByText("Attributes:")).toBeNull();
		expect(screen.queryByText("Created:")).toBeNull();
		// A drive's label is not edited here.
		expect(screen.queryByDisplayValue("Macintosh HD")).toBeNull();
	});

	it("sums up a multiple selection, its mixed attribute drawn mixed", async () => {
		const fs = seed();
		const plan = `${DOCS}:Plan.txt`;
		fs.writeFile(plan, "a plan");
		fs.setMetadata(plan, { _readOnly: true });
		openSheet([NOTES, plan]);
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={[NOTES, plan]}
			/>,
		);
		expect(screen.getByText("Notes.txt, ... Properties")).toBeInTheDocument();
		expect(screen.getByText("2 Files, 0 Folders")).toBeInTheDocument();
		expect(rowValue("Type:")).toBe("All of type Text file");
		expect(rowValue("Location:")).toBe(`All in ${DOCS}`);
		expect(await screen.findByText("11 bytes")).toBeInTheDocument();
		expect(screen.getByRole("checkbox", { name: "Read-only" })).toHaveClass(
			"mixed",
		);
		// Left mixed, Apply writes nothing of it.
		await userEvent
			.setup()
			.click(screen.getByRole("checkbox", { name: "Hidden" }));
		fireEvent.click(screen.getByRole("button", { name: "Apply" }));
		expect(fs.resolve(NOTES)._readOnly).toBeUndefined();
		expect(fs.resolve(plan)._readOnly).toBe(true);
		expect(fs.resolve(NOTES)._invisible).toBe(true);
		expect(fs.resolve(plan)._invisible).toBe(true);
	});

	it("shows an application's icon sheet: its name and Type", () => {
		const fs = seed();
		act(() =>
			dispatch({
				type: "ClassicyAppLoad",
				app: { id: "TV.app", name: "TV", icon: "" },
			}),
		);
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				targetAppId={"TV.app"}
			/>,
		);
		expect(screen.getByText("TV Properties")).toBeInTheDocument();
		expect(rowValue("Type:")).toBe("Application");
		expect(screen.queryByText("Attributes:")).toBeNull();
		expect(screen.getByRole("button", { name: "Apply" })).toBeDisabled();
	});

	it("closes itself when every item is gone", () => {
		const fs = seed();
		openSheet([`${DOCS}:Gone.txt`]);
		const { container } = render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={[`${DOCS}:Gone.txt`]}
			/>,
		);
		expect(container.querySelector(".classicyFileProperties")).toBeNull();
		expect(sheets()).toEqual([]);
	});

	// Under Windows 98's names: the package's type names, and the extension
	// a registered type hides kept by a rename (10.2, 10.8).
	it("names the type the package's way, and keeps a hidden extension on a rename", async () => {
		restore = activateTestWindowsKeysPackage(
			{ files: { extensions: "hideRegistered" } },
			{ fileTypeNames: { text_file: "Text Document" } },
		);
		const fs = new ClassicyFileSystem();
		const path = `${DOCS}:Read Me.txt`;
		fs.writeFile(path, "read me");
		fs.setMetadata(path, { _type: "text_file" as never });
		act(() =>
			useAppManager.setState(
				produce(useAppManager.getState(), (draft) => {
					draft.System.Manager.Applications.fileTypeHandlers.text_file =
						"SimpleText.app";
				}),
			),
		);
		openSheet([path]);
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={[path]}
			/>,
		);
		expect(screen.getByText("Read Me Properties")).toBeInTheDocument();
		expect(rowValue("Type:")).toBe("Text Document");
		const name = screen.getByDisplayValue("Read Me");
		fireEvent.change(name, { target: { value: "Ideas" } });
		fireEvent.click(screen.getByRole("button", { name: "OK" }));
		expect(fs.resolve(`${DOCS}:Ideas.txt`)).toBeDefined();
		expect(sheets()).toEqual([]);
	});

	// The audit's 1.15: the Trash's sheet and its items' Location name it as
	// the package shows it (Windows 98's Recycle Bin), display only.
	it("names the Trash, and its items' Location, the package's way", () => {
		restore = activateTestWindowsKeysPackage(
			{},
			{ desktopIcons: { trash: { name: "Recycle Bin" } } },
		);
		const fs = seed();
		fs.mkDir("Trash");
		fs.writeFile("Trash:Old.txt", "old");
		openSheet(["Trash"]);
		const { unmount } = render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={["Trash"]}
			/>,
		);
		expect(screen.getByText("Recycle Bin Properties")).toBeInTheDocument();
		expect(fs.resolve("Trash")).toBeDefined();
		unmount();
		openSheet(["Trash:Old.txt"]);
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={["Trash:Old.txt"]}
			/>,
		);
		expect(rowValue("Location:")).toBe("Recycle Bin");
	});

	it("keeps the Trash's own name without a name of the package's", () => {
		const fs = seed();
		fs.mkDir("Trash");
		openSheet(["Trash"]);
		render(
			<ClassicyFilePropertiesWindow
				appId={"Finder.app"}
				fs={fs}
				paths={["Trash"]}
			/>,
		);
		expect(screen.getByText("Trash Properties")).toBeInTheDocument();
	});
});
