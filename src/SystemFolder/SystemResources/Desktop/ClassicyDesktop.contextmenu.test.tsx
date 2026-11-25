// The core registers no Appearance Package: these tests draw Platinum.
import "@/__tests__/withPlatinum";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import { DefaultAppManagerState } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { ClassicyAppManagerProvider } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerContext";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktop } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktop";

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
		expect(within(wrapper).getByText("Special")).toBeInTheDocument();
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
