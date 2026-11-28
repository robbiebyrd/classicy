// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";
import {
	clearClassicyFileClipboard,
	getClassicyFileClipboard,
} from "@/SystemFolder/SystemResources/File/ClassicyFileClipboard";
import {
	CLASSICY_DESKTOP_ITEM_ICON_PREFIX,
	classicyDesktopItemIconAction,
} from "@/SystemFolder/SystemResources/File/ClassicyFileMove";
import { ClassicyFileSystem } from "@/SystemFolder/SystemResources/File/ClassicyFileSystem";

describe("ClassicyDesktop contextual menu scoping", () => {
	let restore: (() => void) | null = null;
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});
	afterEach(() => {
		restore?.();
		restore = null;
	});

	// The desktop menu bar always shows "Special" (Finder is frontmost by
	// default), so assert on the contextual-menu portal itself — it renders a
	// `.classicyContextMenuWrapper` only while a context menu is open.
	const contextMenuOpen = () =>
		document.querySelector(".classicyContextMenuWrapper") !== null;

	it("shows defaultMenuItems when right-clicking the empty desktop", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const desktop = document.getElementById("classicyDesktop") as HTMLElement;
		fireEvent.contextMenu(desktop);
		expect(contextMenuOpen()).toBe(true);
		// "Special" is a stable defaultMenuItems entry
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		expect(within(wrapper).getByText("Special")).toBeInTheDocument();
	});

	it("does NOT show defaultMenuItems when right-clicking a child element", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>
					<span>desktop child</span>
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		fireEvent.contextMenu(screen.getByText("desktop child"));
		expect(contextMenuOpen()).toBe(false);
	});

	it("does not open a menu when the event was already claimed (defaultPrevented)", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false}>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
					<span onContextMenu={(e) => e.preventDefault()}>opt-out child</span>
				</ClassicyDesktop>
			</ClassicyAppManagerProvider>,
		);
		fireEvent.contextMenu(screen.getByText("opt-out child"));
		expect(contextMenuOpen()).toBe(false);
	});

	// Shift+F10 and the Application key (WIG Ch.7 "Pop-up Menu Interaction",
	// p.101; the audit's 7.9), under a package that declares
	// `layout.keyboard.contextMenuKey` (Windows 98), reach the same targets a
	// right-click does: the focused desktop icon's menu, and the desktop's own
	// with the desktop itself focused. Platinum declares none: neither key
	// opens a menu.
	it("opens no menu on Shift+F10 or the Application key under Platinum", () => {
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const desktop = document.getElementById("classicyDesktop") as HTMLElement;
		desktop.focus();
		fireEvent.keyDown(desktop, { key: "F10", shiftKey: true });
		fireEvent.keyDown(desktop, { key: "ContextMenu" });
		expect(contextMenuOpen()).toBe(false);
	});

	it("opens the desktop's menu on Shift+F10 with the desktop focused", () => {
		restore = activateTestWindowsKeysPackage();
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const desktop = document.getElementById("classicyDesktop") as HTMLElement;
		desktop.focus();
		fireEvent.keyDown(desktop, { key: "F10", shiftKey: true });
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		// The desktop's white-space menu, Explorer's under the package's
		// `finder.commands` "windows" (C1).
		expect(within(wrapper).getByText("Arrange Icons")).toBeInTheDocument();
	});

	it("opens a focused desktop icon's menu on the Application key", () => {
		restore = activateTestWindowsKeysPackage();
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const trash = screen
			.getAllByText("Trash")
			.map((label) => label.closest<HTMLElement>(".classicyDesktopIcon"))
			.find(Boolean) as HTMLElement;
		trash.focus();
		fireEvent.keyDown(trash, { key: "ContextMenu" });
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		expect(within(wrapper).getByText("Empty Trash…")).toBeInTheDocument();
	});

	// The remaining chapters' audit's 4.17 / B.6 (WIG Ch.4 "Shortcut Keys",
	// p.28; App. B Table B.2): with the desktop itself focused and an icon
	// selected, the key opens the selected icon's menu, not the desktop's.
	it("opens the selected icon's menu, not the desktop's, with the desktop focused", () => {
		restore = activateTestWindowsKeysPackage();
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
		const trash = screen
			.getAllByText("Trash")
			.map((label) => label.closest<HTMLElement>(".classicyDesktopIcon"))
			.find(Boolean) as HTMLElement;
		// Selected from the store, with no press: the key's fallback to where
		// the pointer last went down cannot be what finds it.
		const trashId = useAppManager
			.getState()
			.System.Manager.Desktop.icons.find(
				(icon) => icon.kind === "trash",
			)?.appId;
		act(() => {
			useAppManager.setState((state) => ({
				...state,
				System: {
					...state.System,
					Manager: {
						...state.System.Manager,
						Desktop: {
							...state.System.Manager.Desktop,
							selectedIcons: [trashId as string],
						},
					},
				},
			}));
		});
		expect(trash.classList.contains("selected")).toBe(true);
		const desktop = document.getElementById("classicyDesktop") as HTMLElement;
		desktop.focus();
		fireEvent.keyDown(desktop, { key: "F10", shiftKey: true });
		const wrapper = document.querySelector(
			".classicyContextMenuWrapper",
		) as HTMLElement;
		expect(within(wrapper).getByText("Empty Trash…")).toBeInTheDocument();
		expect(within(wrapper).queryByText("Special")).not.toBeInTheDocument();
	});
});

// Hand-off C1 (the remaining chapters' audit's 1.21, 5.23, 5.28, 5.39, 5.40,
// 10.3, 2.2, 5.27, A.4): under `finder.commands` "windows" (Windows 98) the
// desktop's white-space menu is Explorer's and its bar's File, Edit and View
// are Explorer's (`useClassicyDesktopCommands`), Special following them;
// Platinum keeps the desktop's own menus.
describe("ClassicyDesktop's Explorer commands (C1)", () => {
	let restore: (() => void) | null = null;
	beforeEach(() => {
		localStorage.clear();
		sessionStorage.clear();
		useAppManager.setState(DefaultAppManagerState, true);
	});
	afterEach(() => {
		restore?.();
		restore = null;
	});
	const renderDesktop = () =>
		render(
			<ClassicyAppManagerProvider>
				<ClassicyDesktop startupScreen={false} />
			</ClassicyAppManagerProvider>,
		);
	const wrapper = () =>
		document.querySelector(".classicyContextMenuWrapper") as HTMLElement;
	const appMenuIds = () =>
		(useAppManager.getState().System.Manager.Desktop.appMenu ?? []).map(
			(item) => item.id,
		);

	it("shows Explorer's white-space menu and puts Explorer's File, Edit and View before Special under the Windows commands", () => {
		restore = activateTestWindowsKeysPackage();
		renderDesktop();
		fireEvent.contextMenu(
			document.getElementById("classicyDesktop") as HTMLElement,
			{ clientX: 40, clientY: 50 },
		);
		const menu = within(wrapper());
		for (const title of [
			"Arrange Icons",
			"Line Up Icons",
			"Paste",
			"Paste Shortcut",
			"New",
			"Properties",
		])
			expect(menu.getByText(title)).toBeInTheDocument();
		expect(menu.queryByText("Special")).not.toBeInTheDocument();
		// The bar the headless screen bar dispatches chords from.
		expect(appMenuIds()).toEqual([
			"finder_file",
			"finder_edit",
			"finder_view",
			"finder_special",
		]);
		const file = useAppManager
			.getState()
			.System.Manager.Desktop.appMenu?.find((m) => m.id === "finder_file");
		expect(file?.menuChildren?.map((i) => i.title)).toContain("Properties");
		const edit = useAppManager
			.getState()
			.System.Manager.Desktop.appMenu?.find((m) => m.id === "finder_edit");
		expect(edit?.disabled).not.toBe(true);
		expect(edit?.menuChildren?.map((i) => i.title)).toContain("Cut");
	});

	it("keeps the desktop's own menus without the Windows commands (Platinum)", () => {
		renderDesktop();
		fireEvent.contextMenu(
			document.getElementById("classicyDesktop") as HTMLElement,
		);
		const menu = within(wrapper());
		expect(menu.getByText("Special")).toBeInTheDocument();
		expect(menu.queryByText("Arrange Icons")).not.toBeInTheDocument();
		expect(appMenuIds()).toEqual([
			"finder_file",
			"finder_edit",
			"finder_view",
			"finder_special",
		]);
		const desktopMenu = useAppManager.getState().System.Manager.Desktop.appMenu;
		expect(desktopMenu?.[0].menuChildren?.map((i) => i.title)).toEqual([
			"Move To Trash",
		]);
		expect(desktopMenu?.[1].disabled).toBe(true);
	});

	it("cuts a selected desktop file with Ctrl+X under the Windows commands, and takes no Ctrl+X under Platinum", () => {
		const seed = () => {
			const fs = new ClassicyFileSystem();
			const path = "Macintosh HD:Desktop Folder:Plan.txt";
			fs.writeFile(path, "plan");
			const action = classicyDesktopItemIconAction(fs, path, [10, 10]);
			if (action) act(() => dispatch(action));
			const id = `${CLASSICY_DESKTOP_ITEM_ICON_PREFIX}${path}`;
			act(() => {
				useAppManager.setState(
					produce(useAppManager.getState(), (draft) => {
						draft.System.Manager.Desktop.selectedIcons = [id];
					}),
				);
			});
			return path;
		};
		const ctrlX = () => {
			const desktop = document.getElementById("classicyDesktop") as HTMLElement;
			desktop.focus();
			fireEvent.keyDown(desktop, { key: "x", code: "KeyX", ctrlKey: true });
		};

		const platinum = renderDesktop();
		seed();
		ctrlX();
		expect(getClassicyFileClipboard()).toBeNull();
		platinum.unmount();

		restore = activateTestWindowsKeysPackage();
		renderDesktop();
		const path = seed();
		ctrlX();
		expect(getClassicyFileClipboard()).toMatchObject({
			op: "cut",
			paths: [path],
		});
		clearClassicyFileClipboard();
	});
});
