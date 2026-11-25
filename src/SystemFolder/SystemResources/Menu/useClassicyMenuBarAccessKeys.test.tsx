// The flash class comes from Platinum's MenuItem press hook; Platinum is the
// default package.
import "@classicy/appearance-platinum";
import { produce } from "immer";
import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { useClassicyShortcutDispatcher } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyShortcutDispatcher";
import {
	ClassicyMenu,
	type ClassicyMenuItem,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyMenuProvider } from "@/SystemFolder/SystemResources/Menu/ClassicyMenuProvider";

vi.mock("@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss", () => ({}));

// The remaining chapters' audit's 4.14 (WIG Ch.4 "Shortcut Keys", p.27:
// "avoid ALT+key combinations, because they conflict with access keys"):
// under a package's `layout.menu.accessKeys`, Alt and a menu bar title's
// access key open its menu ahead of a menu item's ⌥ chord, with the
// app-wide menu-shortcut dispatcher mounted as the screen bar mounts it;
// a ⌥ chord no title holds still runs, and so does every ⌥ chord under
// Platinum, which has no access keys.

const Dispatcher = ({ menu }: { menu: ClassicyMenuItem[] }) => {
	useClassicyShortcutDispatcher(menu);
	return null;
};

const claim = (chords: string[]) =>
	act(() => {
		useAppManager.setState(
			produce(useAppManager.getState(), (draft) => {
				draft.System.Manager.Keyboard.system = chords;
			}),
		);
	});

const spies = () => ({ find: vi.fn(), close: vi.fn(), undo: vi.fn() });

const barItems = (s: ReturnType<typeof spies>): ClassicyMenuItem[] => [
	{
		id: "file",
		title: "File",
		menuChildren: [
			{
				id: "find",
				title: "Find",
				keyboardShortcut: "⌥F",
				onClickFunc: s.find,
			},
			{
				id: "close",
				title: "Close",
				keyboardShortcut: "⌥W",
				onClickFunc: s.close,
			},
		],
	},
	{
		id: "edit",
		title: "Edit",
		menuChildren: [{ id: "undo", title: "Undo", onClickFunc: s.undo }],
	},
];

const renderBar = (s = spies()) => {
	const items = barItems(s);
	claim(["option+f", "option+w"]);
	render(
		<ClassicyMenuProvider>
			<button type="button">before</button>
			<ClassicyMenu
				name="bar"
				menuItems={items}
				navClass="classicyDesktopMenu"
				subNavClass="classicySubMenu"
			/>
			<Dispatcher menu={items} />
		</ClassicyMenuProvider>,
	);
	return s;
};

const item = (id: string) => document.getElementById(id) as HTMLElement;
const alt = (k: string, target: Element) =>
	fireEvent.keyDown(target, {
		key: k,
		code: `Key${k.toUpperCase()}`,
		altKey: true,
	});

let restore: (() => void) | undefined;
afterEach(() => {
	claim([]);
	restore?.();
	restore = undefined;
});

describe("useClassicyMenuBarAccessKeys with the menu-shortcut dispatcher mounted", () => {
	it("opens a title on Alt and its key ahead of a ⌥ chord, and runs a chord no title holds", () => {
		restore = activateTestWindowsKeysPackage({
			menu: { keys: "windows", accessKeys: "auto" },
		});
		const s = renderBar();
		const before = screen.getByText("before");
		before.focus();
		expect(alt("f", before)).toBe(false);
		expect(item("file")).toHaveClass("open");
		expect(s.find).not.toHaveBeenCalled();
		fireEvent.keyDown(item("find"), { key: "Escape" });
		fireEvent.keyDown(item("file"), { key: "Escape" });
		// No title has "w": the ⌥W item (Close, Windows' residual: Ctrl+F4
		// is the browser's) runs.
		before.focus();
		expect(alt("w", before)).toBe(false);
		expect(s.close).toHaveBeenCalledTimes(1);
		expect(item("edit")).not.toHaveClass("open");
	});

	it("leaves the keys to an open menu: a title's key does not move to it", () => {
		restore = activateTestWindowsKeysPackage({
			menu: { keys: "windows", accessKeys: "auto" },
		});
		const s = renderBar();
		const before = screen.getByText("before");
		before.focus();
		alt("f", before);
		expect(item("file")).toHaveClass("open");
		// Focus in the File menu: Alt and Edit's key are the menu's, and the
		// dispatcher runs no ⌥ chord for them.
		alt("e", document.activeElement as Element);
		expect(item("edit")).not.toHaveClass("open");
		expect(item("file")).toHaveClass("open");
		expect(s.undo).not.toHaveBeenCalled();
	});

	it("prevents a lone Alt's release, so a browser's own menu bar stays shut", () => {
		restore = activateTestWindowsKeysPackage({
			menu: { keys: "windows", accessKeys: "auto" },
		});
		renderBar();
		const before = screen.getByText("before");
		before.focus();
		fireEvent.keyDown(before, { key: "Alt", code: "AltLeft", altKey: true });
		expect(fireEvent.keyUp(before, { key: "Alt", code: "AltLeft" })).toBe(
			false,
		);
		expect(item("file")).toHaveFocus();
	});

	it("leaves every ⌥ chord to the dispatcher by default (Platinum)", () => {
		const s = renderBar();
		const before = screen.getByText("before");
		before.focus();
		alt("f", before);
		expect(s.find).toHaveBeenCalledTimes(1);
		expect(item("file")).not.toHaveClass("open");
		fireEvent.keyDown(before, { key: "Alt", code: "AltLeft", altKey: true });
		expect(fireEvent.keyUp(before, { key: "Alt", code: "AltLeft" })).toBe(true);
		expect(before).toHaveFocus();
	});
});
