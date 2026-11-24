import "@classicy/appearance-platinum";
import {
	act,
	fireEvent,
	render,
	renderHook,
	screen,
} from "@testing-library/react";
import { produce } from "immer";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyStore,
	type ClassicyStoreSystemApp,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";
import { useClassicyStandardHelpMenu } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyStandardHelpMenu";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindowMenuBar } from "@/SystemFolder/SystemResources/Window/ClassicyWindowMenuBar";

function setStore(mutate: (draft: ClassicyStore) => void): void {
	act(() => {
		useAppManager.setState(produce(DefaultAppManagerState, mutate), true);
	});
}

const makeApp = (
	id: string,
	extra: Partial<ClassicyStoreSystemApp> = {},
): ClassicyStoreSystemApp => ({
	id,
	name: id,
	icon: "",
	windows: {},
	open: true,
	focused: false,
	data: {},
	...extra,
});

describe("standard Help menu", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("is About, Show/Hide Balloons, then the help content, in three groups (HIGOS8 Figure 4-2)", () => {
		render(<ClassicyDesktopMenuBar />);
		fireEvent.click(screen.getByText("Help"));
		const menu = document.querySelector("#help-menu") as HTMLElement;
		// A divider is a separator row, not an item: it has no id.
		const list = menu.querySelector("ul") as HTMLElement;
		const rows = [...list.children].map((c) =>
			c.tagName === "HR" ? "|" : c.id,
		);
		expect(rows).toEqual([
			"help-about-balloon",
			"|",
			"help-toggle-balloons",
			"|",
			"help-keyboard-shortcuts",
		]);
	});

	it("words the first item per package: Platinum 'About Help' (HIGOS8 Figure 4-2)", () => {
		render(<ClassicyDesktopMenuBar />);
		fireEvent.click(screen.getByText("Help"));
		expect(screen.getByText("About Help")).toBeInTheDocument();
		expect(screen.queryByText("About Balloon Help…")).toBeNull();
	});

	it("window placement: the window's own bar ends with the standard Help menu", () => {
		render(
			<ClassicyWindowMenuBar
				appId="Finder.app"
				windowId="w"
				menuItems={[
					{
						id: "f",
						title: "File",
						menuChildren: [{ id: "x", title: "Xx" }],
					},
					{
						id: "fh",
						title: "Help",
						menuChildren: [{ id: "fh1", title: "Own Help Item" }],
					},
				]}
			/>,
		);
		expect(screen.getAllByText("Help")).toHaveLength(1);
		fireEvent.click(screen.getByText("Help"));
		expect(screen.getByText("About Help")).toBeInTheDocument();
		expect(screen.getByText("Hide Balloons")).toBeInTheDocument();
		expect(screen.getByText("Keyboard Shortcuts")).toBeInTheDocument();
		expect(screen.getByText("Own Help Item")).toBeInTheDocument();
	});

	it("keeps the front app's menus and chords while an extension's window takes focus", () => {
		const quit = vi.fn();
		const menu: ClassicyMenuItem[] = [
			{
				id: "Calc_file",
				title: "File",
				menuChildren: [
					{
						id: "Calc_quit",
						title: "Quit",
						keyboardShortcut: "⌥Q",
						onClickFunc: quit,
					},
				],
			},
		];
		setStore((draft) => {
			draft.System.Manager.Applications.apps = {
				"Finder.app": makeApp("Finder.app"),
				"Calculator.app": makeApp("Calculator.app", {
					focused: true,
					lastFocusedAt: 5,
				}),
				"AppleGuide.app": makeApp("AppleGuide.app", {
					extension: true,
					windows: {
						guide: {
							id: "guide",
							closed: false,
							size: [100, 100],
							position: [0, 0],
							minimumSize: [10, 10],
							menuBar: [],
						},
					},
				}),
			};
			draft.System.Manager.Applications.focusedAppId = "Calculator.app";
			draft.System.Manager.Desktop.appMenu = menu;
		});
		render(<ClassicyDesktopMenuBar />);

		// The guide's window takes focus and publishes no menus.
		act(() => {
			dispatch({
				type: "ClassicyWindowFocus",
				app: { id: "AppleGuide.app" },
				window: { id: "guide", menuBar: [] },
			});
		});
		const s = useAppManager.getState().System.Manager;
		expect(s.Applications.focusedAppId).toBe("AppleGuide.app");
		expect(s.Desktop.appMenu).toBe(menu);
		// Calculator's File menu is still in the bar and its chord still claims.
		expect(screen.getByText("File")).toBeInTheDocument();
		expect(s.Keyboard.app["Calculator.app"]).toEqual(["option+q"]);
		fireEvent.keyDown(document, { key: "q", code: "KeyQ", altKey: true });
		expect(quit).toHaveBeenCalledTimes(1);
	});
});

describe("useClassicyStandardHelpMenu merge", () => {
	const merge = (appMenu: ClassicyMenuItem[]) =>
		renderHook(() => useClassicyStandardHelpMenu({ appMenu, appId: undefined }))
			.result.current;
	const tail = (m: ReturnType<typeof merge>) =>
		(m.helpItem.menuChildren ?? []).slice(5).map((i) => i.title ?? "|");

	it("trims dividers left at the ends by the app's own Help items", () => {
		const m = merge([
			{
				id: "h",
				title: "Help",
				menuChildren: [{ id: "a", title: "A" }, { id: "spacer" }],
			},
		]);
		expect(tail(m)).toEqual(["A"]);
		expect(m.appMenu).toEqual([]);
	});

	it("merges several Help menus and a childless Help, drawing one", () => {
		const m = merge([
			{ id: "f", title: "File", menuChildren: [{ id: "x", title: "X" }] },
			{ id: "h1", title: "Help", menuChildren: [{ id: "a", title: "A" }] },
			{ id: "h2", title: "Help", menuChildren: [{ id: "b", title: "B" }] },
			{ id: "h3", title: "Help", onClickFunc: () => {} },
		]);
		expect(tail(m)).toEqual(["A", "B", "Help"]);
		expect(m.appMenu?.map((i) => i.title)).toEqual(["File"]);
	});

	it("a chord on a merged Help item stays in the item", () => {
		const m = merge([
			{
				id: "h",
				title: "Help",
				menuChildren: [{ id: "a", title: "A", keyboardShortcut: "⌥J" }],
			},
		]);
		expect(
			(m.helpItem.menuChildren ?? []).find((i) => i.id === "a")
				?.keyboardShortcut,
		).toBe("⌥J");
	});
});
