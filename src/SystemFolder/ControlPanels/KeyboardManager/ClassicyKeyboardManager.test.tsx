import { act, cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyControlPanels } from "@/SystemFolder/ControlPanels/ClassicyControlPanels";
import {
	ClassicyKeyboardManager,
	classicyKeyboardShortcutsInUse,
} from "@/SystemFolder/ControlPanels/KeyboardManager/ClassicyKeyboardManager";
import { KEYBOARD_MANAGER_APP_ID } from "@/SystemFolder/ControlPanels/KeyboardManager/ClassicyKeyboardManagerManifest";
import { CLASSICY_BUNDLED_MENU_SHORTCUTS } from "@/SystemFolder/ControlPanels/KeyboardManager/ClassicyKeyboardShortcutCatalog";
import {
	isClassicyAppMounted,
	markClassicyAppMounted,
} from "@/SystemFolder/SystemResources/App/ClassicyMountedApps";

// The Keyboard control panel (the remaining chapters' audit's 4.15; WIG Ch.4
// "Shortcut Keys", p.27: "let the user change shortcut assignments where
// possible"), under `layout.keyboard.editableShortcuts`.
const EDITABLE_LAYOUT = {
	menu: { keys: "windows" as const, shortcutSpelling: "names" as const },
	keyboard: {
		contextMenuKey: true,
		command: "ctrl" as const,
		editableShortcuts: true,
	},
};

const overrides = () =>
	useAppManager.getState().System.Manager.Desktop.shortcutOverrides;

const renderOpen = () => {
	dispatch({
		type: "ClassicyAppOpen",
		app: { id: KEYBOARD_MANAGER_APP_ID, name: "Keyboard", icon: "" },
	});
	return render(<ClassicyKeyboardManager />);
};

const field = (title: string) =>
	screen.getByLabelText(title, { selector: "output" });

let restore: () => void = () => {};
let unmark: (() => void)[] = [];
beforeEach(() => {
	useAppManager.setState(structuredClone(DefaultAppManagerState), true);
	restore = activateTestWindowsKeysPackage(EDITABLE_LAYOUT);
	unmark = ["Finder.app", "SoundManager.app"].map(markClassicyAppMounted);
});
afterEach(() => {
	cleanup();
	for (const u of unmark) u();
	restore();
});

describe("ClassicyKeyboardManager", () => {
	it("lists the mounted apps' commands that carry a shortcut, under each app's name, with their chords", () => {
		renderOpen();
		expect(screen.getByRole("tab", { name: "Shortcuts" })).toBeInTheDocument();
		const groups = [
			...document.querySelectorAll(".classicyKeyboardManagerShortcuts > *"),
		];
		// Finder, Sound Manager and the panel itself, in the catalog's order;
		// HyperCard is not mounted, so it is not listed.
		expect(
			groups.map(
				(group) =>
					within(group as HTMLElement).getAllByText(/.+/)[0].textContent,
			),
		).toEqual(["Finder", "Sound Manager", "Keyboard"]);
		expect(screen.queryByText("Tools")).not.toBeInTheDocument();
		expect(field("Open")).toHaveTextContent("Ctrl+O");
		expect(field("Move To Trash")).toHaveTextContent("Ctrl+Backspace");
		expect(field("Select All")).toHaveTextContent("Ctrl+A");
		expect(
			screen.getAllByLabelText("Quit", { selector: "output" })[0],
		).toHaveTextContent("Alt+Q");
		expect(screen.getByRole("button", { name: "Reset" })).toBeDisabled();
	});

	it("stores a new shortcut, shows it, and Reset restores every app's own", async () => {
		renderOpen();
		const user = userEvent.setup();
		const finder = screen
			.getByText("Finder")
			.closest("fieldset") as HTMLElement;
		await user.click(
			within(finder).getAllByRole("button", { name: "Change…" })[0],
		);
		await act(async () => {
			window.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "k",
					code: "KeyK",
					ctrlKey: true,
					bubbles: true,
					cancelable: true,
				}),
			);
		});
		await user.click(screen.getByRole("button", { name: "OK" }));
		expect(overrides()).toEqual({ finder_file_open: "command+k" });
		expect(field("Open")).toHaveTextContent("Ctrl+K");
		const reset = screen.getByRole("button", { name: "Reset" });
		expect(reset).toBeEnabled();
		await user.click(reset);
		expect(overrides()).toBeUndefined();
		expect(field("Open")).toHaveTextContent("Ctrl+O");
	});

	it("refuses a chord another command of the app or the browser's edits use, naming it", () => {
		const open = CLASSICY_BUNDLED_MENU_SHORTCUTS.find(
			(entry) => entry.id === "finder_file_open",
		);
		if (!open) throw new Error("no Open");
		const inUse = classicyKeyboardShortcutsInUse(open, {
			finder_edit_select_all: "control+command+a",
		});
		expect(inUse).toContainEqual({ shortcut: "⌃⌘A", name: "Select All" });
		expect(inUse).toContainEqual({ shortcut: "⌃⌫", name: "Move To Trash" });
		expect(inUse).toContainEqual({ shortcut: "⌘C", name: "Copy" });
		expect(inUse.map((entry) => entry.name)).not.toContain("Open");
		// Another app's commands are not in its way.
		expect(inUse.map((entry) => entry.name)).not.toContain("Quit");
	});

	it("lists every bundled command once, by a unique id, each with a chord a menu can carry", () => {
		const ids = CLASSICY_BUNDLED_MENU_SHORTCUTS.map((entry) => entry.id);
		expect(new Set(ids).size).toBe(ids.length);
		expect(Object.isFrozen(CLASSICY_BUNDLED_MENU_SHORTCUTS)).toBe(true);
	});
});

describe("ClassicyControlPanels — the Keyboard panel", () => {
	it("is mounted under keyboard.editableShortcuts", () => {
		render(<ClassicyControlPanels />);
		expect(isClassicyAppMounted(KEYBOARD_MANAGER_APP_ID)).toBe(true);
	});

	it("is not mounted without the key (Platinum's and System 7's Control Panels)", () => {
		restore();
		restore = () => {};
		render(<ClassicyControlPanels />);
		expect(isClassicyAppMounted(KEYBOARD_MANAGER_APP_ID)).toBe(false);
		expect(isClassicyAppMounted("SoundManager.app")).toBe(true);
	});
});
