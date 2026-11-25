import {
	act,
	cleanup,
	fireEvent,
	render,
	screen,
} from "@testing-library/react";
import { createRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { registerClassicySystemArt } from "@/Appearance/ClassicyAssetRegistry";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import {
	ClassicyIcon,
	snapToGrid,
} from "@/SystemFolder/SystemResources/Icon/ClassicyIcon";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

afterEach(cleanup);

describe("snapToGrid", () => {
	it("rounds to the nearest cell", () => {
		expect(snapToGrid([37, 61], [24, 24])).toEqual([48, 72]);
	});

	it("rounds down below the halfway point", () => {
		expect(snapToGrid([10, 10], [24, 24])).toEqual([0, 0]);
	});

	it("leaves an already-aligned position alone", () => {
		expect(snapToGrid([48, 24], [24, 24])).toEqual([48, 24]);
	});

	it("supports a non-square pitch", () => {
		expect(snapToGrid([30, 30], [20, 40])).toEqual([40, 40]);
	});

	it("rounds onto a lattice offset by an origin", () => {
		// Cells at 12, 108, 204… — never at 0 or 96, which is where an
		// origin-less snap would put a drop.
		expect(snapToGrid([100, 100], [96, 96], [12, 12])).toEqual([108, 108]);
		expect(snapToGrid([40, 40], [96, 96], [12, 12])).toEqual([12, 12]);
	});

	it("leaves a position already on the offset lattice alone", () => {
		expect(snapToGrid([108, 12], [96, 96], [12, 12])).toEqual([108, 12]);
	});
});

describe("ClassicyIcon snapping", () => {
	const renderIcon = () =>
		render(
			<ClassicyIcon
				appId={"Test.app"}
				name={"thing.pdf"}
				icon={"data:image/gif;base64,R0lGODlhAQABAAAAACw="}
				initialPosition={[50, 50]}
				snapTo={[96, 96]}
				snapOrigin={[12, 12]}
			/>,
		);

	const iconRoot = () =>
		screen.getByRole("img").closest(".classicyIcon") as HTMLElement;

	it("does not move an icon that was only clicked", () => {
		renderIcon();
		const icon = iconRoot();
		// mousedown/mouseup with no intervening move is a selection click, not a
		// drag. Mac OS 8 never displaced an icon you merely clicked.
		fireEvent.mouseDown(icon);
		fireEvent.mouseUp(icon);
		expect(icon.style.left).toBe("50px");
		expect(icon.style.top).toBe("50px");
	});
});

describe("ClassicyIcon consumer style", () => {
	// Stacking belongs to the icon states (ClassicyIcon.scss: 10, dragging
	// 500), which no longer win by !important; a consumer zIndex is dropped.
	it("drops a consumer zIndex and keeps the rest", () => {
		render(
			<ClassicyIcon
				appId={"Test.app"}
				name={"thing.pdf"}
				icon={"data:image/gif;base64,R0lGODlhAQABAAAAACw="}
				initialPosition={[50, 50]}
				style={{ zIndex: 7, opacity: 0.5 }}
			/>,
		);
		const icon = screen
			.getByRole("img")
			.closest(".classicyIcon") as HTMLElement;
		expect(icon.style.zIndex).toBe("");
		expect(icon.style.opacity).toBe("0.5");
	});
});

// WIG Ch.13 "Highlighting" (p.318): the icon says whether its window is the
// active one (the audit's 6.4 / 13.8), so a package can draw a selected item
// of an inactive window apart (Windows 98's list view, LVS_SHOWSELALWAYS).
describe("ClassicyIcon — inactive", () => {
	const icon = (
		<ClassicyIcon
			appId={"Test.app"}
			name={"thing.pdf"}
			icon={"data:image/gif;base64,R0lGODlhAQABAAAAACw="}
		/>
	);
	const iconRoot = () =>
		screen.getByRole("img").closest(".classicyIcon") as HTMLElement;

	it("carries inactive in a window that is not the active one, beside selected", () => {
		render(
			<ClassicyWindowActiveContext.Provider value={false}>
				{icon}
			</ClassicyWindowActiveContext.Provider>,
		);
		expect(iconRoot()).toHaveClass("inactive");
		fireEvent.click(iconRoot());
		expect(iconRoot()).toHaveClass("selected", "inactive");
	});

	it("does not in the active window, or outside any window", () => {
		render(
			<ClassicyWindowActiveContext.Provider value={true}>
				{icon}
			</ClassicyWindowActiveContext.Provider>,
		);
		expect(iconRoot()).not.toHaveClass("inactive");
		cleanup();
		render(icon);
		expect(iconRoot()).not.toHaveClass("inactive");
	});
});

// Explorer's Cut (the remaining chapters' audit's 5.28; WIG Ch.5 "Command
// Method Transfers", p.66): `cut` draws the item as cut and waiting for a
// Paste, through `classicyFileCut`, which only a package's stylesheet reads.
describe("ClassicyIcon — cut", () => {
	const iconRoot = () =>
		screen.getByRole("img").closest(".classicyIcon") as HTMLElement;
	const icon = (cut?: boolean) => (
		<ClassicyIcon
			appId={"Test.app"}
			name={"thing.pdf"}
			icon={"data:image/gif;base64,R0lGODlhAQABAAAAACw="}
			cut={cut}
		/>
	);

	it("carries classicyFileCut while cut, beside its states", () => {
		render(icon(true));
		expect(iconRoot()).toHaveClass("classicyIcon", "classicyFileCut");
		fireEvent.click(iconRoot());
		expect(iconRoot()).toHaveClass("selected", "classicyFileCut");
	});

	it("does not by default, or once the Paste lets it go", () => {
		const { rerender } = render(icon());
		expect(iconRoot()).not.toHaveClass("classicyFileCut");
		rerender(icon(true));
		rerender(icon(false));
		expect(iconRoot()).not.toHaveClass("classicyFileCut");
	});
});

// The file browser's icon view keeps one selection for its icons: given
// `selected`, an icon draws what it is told and hands its clicks to
// `onSelectClick`; without it, a click toggles its own look, as before.
describe("ClassicyIcon — controlled selection", () => {
	const props = {
		appId: "Test.app",
		name: "thing.pdf",
		icon: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
	};
	const iconRoot = () =>
		screen.getByRole("img").closest(".classicyIcon") as HTMLElement;

	it("draws the selection it is given, and hands a click to onSelectClick", () => {
		const onSelectClick = vi.fn();
		const { rerender } = render(
			<ClassicyIcon
				{...props}
				selected={false}
				onSelectClick={onSelectClick}
			/>,
		);
		fireEvent.click(iconRoot(), { shiftKey: true });
		expect(onSelectClick).toHaveBeenCalledOnce();
		expect(onSelectClick.mock.calls[0][0].shiftKey).toBe(true);
		expect(iconRoot()).not.toHaveClass("selected");
		rerender(
			<ClassicyIcon {...props} selected={true} onSelectClick={onSelectClick} />,
		);
		expect(iconRoot()).toHaveClass("selected");
	});

	it("still toggles its own look without `selected`", () => {
		render(<ClassicyIcon {...props} />);
		fireEvent.click(iconRoot());
		expect(iconRoot()).toHaveClass("selected");
		fireEvent.click(iconRoot());
		expect(iconRoot()).not.toHaveClass("selected");
	});
});

describe("ClassicyIcon — renaming", () => {
	const props = {
		appId: "Test.app",
		name: "thing.pdf",
		icon: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
	};
	const field = () =>
		document.querySelector(".classicyIconRename") as HTMLInputElement;

	it("shows the name in a focused, selected field in place of the caption", () => {
		render(<ClassicyIcon {...props} renaming={true} />);
		expect(document.querySelector(".classicyIcon p")).toBeNull();
		expect(field().value).toBe("thing.pdf");
		expect(document.activeElement).toBe(field());
		expect([field().selectionStart, field().selectionEnd]).toEqual([0, 9]);
	});

	it("commits once on Return or on a click elsewhere, cancels on Escape", () => {
		const onRenameCommit = vi.fn();
		const onRenameCancel = vi.fn();
		const { rerender } = render(
			<ClassicyIcon
				{...props}
				renaming={true}
				onRenameCommit={onRenameCommit}
				onRenameCancel={onRenameCancel}
			/>,
		);
		fireEvent.change(field(), { target: { value: "new.pdf" } });
		fireEvent.keyDown(field(), { key: "Enter" });
		fireEvent.blur(field());
		expect(onRenameCommit).toHaveBeenCalledTimes(1);
		expect(onRenameCommit).toHaveBeenCalledWith("new.pdf");
		rerender(<ClassicyIcon {...props} renaming={false} />);
		rerender(
			<ClassicyIcon
				{...props}
				renaming={true}
				onRenameCommit={onRenameCommit}
				onRenameCancel={onRenameCancel}
			/>,
		);
		fireEvent.blur(field());
		expect(onRenameCommit).toHaveBeenCalledTimes(2);
		rerender(<ClassicyIcon {...props} renaming={false} />);
		rerender(
			<ClassicyIcon
				{...props}
				renaming={true}
				onRenameCommit={onRenameCommit}
				onRenameCancel={onRenameCancel}
			/>,
		);
		fireEvent.keyDown(field(), { key: "Escape" });
		expect(onRenameCancel).toHaveBeenCalledOnce();
		expect(onRenameCommit).toHaveBeenCalledTimes(2);
	});

	it("keeps the field's presses, clicks and keys from the icon", () => {
		const onSelectClick = vi.fn();
		const onClickFunc = vi.fn();
		render(
			<ClassicyIcon
				{...props}
				renaming={true}
				selected={true}
				onSelectClick={onSelectClick}
				onClickFunc={onClickFunc}
			/>,
		);
		fireEvent.mouseDown(field());
		fireEvent.click(field());
		fireEvent.doubleClick(field());
		fireEvent.keyDown(field(), { key: " " });
		expect(onSelectClick).not.toHaveBeenCalled();
		expect(onClickFunc).not.toHaveBeenCalled();
	});
});

// An icon dragged by itself (no `onFileDrag`) under the Windows 98 layout,
// against the default (Mac OS 8): it waits 4 px before it moves and keeps
// where it was grabbed (`mouse` "windows", the audit's 4.9; WIG Ch.4 "Mouse
// Actions", p.24), only button 1 drags it (4.10), and Escape puts it back
// (`input.escapeCancels`, 1.18 / 4.16; Ch.4 "Shortcut Keys", p.27).
describe("ClassicyIcon — dragging it under the Windows layout", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const useWindowsLayout = () =>
		registerClassicyAppearancePackage({
			id: "windows-icon",
			name: "Windows icon",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-icon-default",
				package: "windows-icon",
			},
			layout: windows98.layout as never,
		});
	const renderIcon = () => {
		const holder = createRef<HTMLDivElement>();
		render(
			<div ref={holder}>
				<ClassicyIcon
					appId={"Test.app"}
					name={"thing.pdf"}
					icon={"data:image/gif;base64,R0lGODlhAQABAAAAACw="}
					initialPosition={[50, 50]}
					holder={holder}
				/>
			</div>,
		);
		return screen.getByRole("img").closest(".classicyIcon") as HTMLElement;
	};
	const at = (icon: HTMLElement) => [icon.style.left, icon.style.top];
	const pressEscape = () => {
		const event = new KeyboardEvent("keydown", {
			key: "Escape",
			bubbles: true,
			cancelable: true,
		});
		act(() => {
			document.body.dispatchEvent(event);
		});
		return event;
	};

	it("centers the icon under the pointer from the first move without the key", () => {
		const icon = renderIcon();
		fireEvent.mouseDown(icon, { button: 0, clientX: 60, clientY: 60 });
		fireEvent.mouseMove(icon, { clientX: 61, clientY: 60 });
		// The holder and the icon measure 0 here: the pointer is the corner.
		expect(at(icon)).toEqual(["61px", "60px"]);
		fireEvent.mouseUp(icon);
	});

	it("waits 4 px from the press, then keeps the grab, under the Windows layout", () => {
		useWindowsLayout();
		const icon = renderIcon();
		fireEvent.mouseDown(icon, { button: 0, clientX: 60, clientY: 60 });
		fireEvent.mouseMove(icon, { clientX: 62, clientY: 62 });
		expect(at(icon)).toEqual(["50px", "50px"]);
		fireEvent.mouseMove(icon, { clientX: 64, clientY: 60 });
		expect(at(icon)).toEqual(["54px", "50px"]);
		fireEvent.mouseMove(icon, { clientX: 70, clientY: 75 });
		expect(at(icon)).toEqual(["60px", "65px"]);
		fireEvent.mouseUp(icon);
	});

	it("drags on button 1 alone under the Windows layout, on any button without it", () => {
		useWindowsLayout();
		const windowsIcon = renderIcon();
		fireEvent.mouseDown(windowsIcon, { button: 1, clientX: 60, clientY: 60 });
		fireEvent.mouseMove(windowsIcon, { clientX: 90, clientY: 90 });
		fireEvent.mouseUp(windowsIcon, { button: 1 });
		expect(at(windowsIcon)).toEqual(["50px", "50px"]);
		cleanup();
		resetClassicyAppearancePackagesForTests();
		const macIcon = renderIcon();
		fireEvent.mouseDown(macIcon, { button: 1, clientX: 60, clientY: 60 });
		fireEvent.mouseMove(macIcon, { clientX: 90, clientY: 90 });
		fireEvent.mouseUp(macIcon, { button: 1 });
		expect(at(macIcon)).toEqual(["90px", "90px"]);
	});

	it("puts the icon back on Escape under the Windows layout, and ends the drag", () => {
		useWindowsLayout();
		const icon = renderIcon();
		fireEvent.mouseDown(icon, { button: 0, clientX: 60, clientY: 60 });
		fireEvent.mouseMove(icon, { clientX: 80, clientY: 90 });
		expect(at(icon)).toEqual(["70px", "80px"]);
		expect(pressEscape().defaultPrevented).toBe(true);
		expect(at(icon)).toEqual(["50px", "50px"]);
		expect(icon).not.toHaveClass("dragging");
		fireEvent.mouseMove(icon, { clientX: 100, clientY: 100 });
		expect(at(icon)).toEqual(["50px", "50px"]);
		fireEvent.mouseUp(icon);
	});

	it("leaves Escape alone mid-drag without the key", () => {
		const icon = renderIcon();
		fireEvent.mouseDown(icon, { button: 0, clientX: 60, clientY: 60 });
		fireEvent.mouseMove(icon, { clientX: 80, clientY: 90 });
		expect(pressEscape().defaultPrevented).toBe(false);
		expect(at(icon)).toEqual(["80px", "90px"]);
		fireEvent.mouseUp(icon);
	});
});

// The props the file browser's icon view uses under the Windows 98 layout
// (the WIG audit's 5.8 / 5.22, 5.16 and 5.17): a press handed to the
// caller before any drag, the option role, one Tab stop, the outline's
// parts and the travel a drop reports, moving with others, and Space as
// the Select key under `selection.keyboard` "windows".
describe("ClassicyIcon — the icon view's props", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const props = {
		appId: "Test.app",
		name: "thing.pdf",
		icon: "data:image/gif;base64,R0lGODlhAQABAAAAACw=",
	};
	const iconRoot = () =>
		screen.getByRole("img").closest(".classicyIcon") as HTMLElement;
	const useWindowsLayout = () =>
		registerClassicyAppearancePackage({
			id: "windows-icon-view",
			name: "Windows icon view",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-icon-view-default",
				package: "windows-icon-view",
			},
			layout: windows98.layout as never,
		});

	it("hands every button's press to onSelectPress when controlled, before the drag", () => {
		const onSelectPress = vi.fn();
		const onFileDrag = vi.fn(() => true);
		render(
			<ClassicyIcon
				{...props}
				selected={false}
				onSelectPress={onSelectPress}
				onFileDrag={onFileDrag}
			/>,
		);
		fireEvent.mouseDown(iconRoot(), { button: 2 });
		fireEvent.mouseDown(iconRoot(), { button: 0, ctrlKey: true });
		expect(onSelectPress.mock.calls.map(([e]) => e.button)).toEqual([2, 0]);
		expect(onSelectPress.mock.calls[1][0].ctrlKey).toBe(true);
		fireEvent.mouseUp(document);
	});

	it("never calls onSelectPress uncontrolled", () => {
		const onSelectPress = vi.fn();
		render(<ClassicyIcon {...props} onSelectPress={onSelectPress} />);
		fireEvent.mouseDown(iconRoot(), { button: 0 });
		fireEvent.mouseUp(iconRoot());
		expect(onSelectPress).not.toHaveBeenCalled();
	});

	it("is a list box's option with listOption, a button otherwise", () => {
		const { rerender } = render(
			<ClassicyIcon {...props} selected={true} listOption />,
		);
		expect(iconRoot().getAttribute("role")).toBe("option");
		expect(iconRoot().getAttribute("aria-selected")).toBe("true");
		rerender(<ClassicyIcon {...props} selected={true} />);
		expect(iconRoot().getAttribute("role")).toBe("button");
		expect(iconRoot().hasAttribute("aria-selected")).toBe(false);
	});

	it("is a Tab stop unless tabStop is false", () => {
		const { rerender } = render(<ClassicyIcon {...props} />);
		expect(iconRoot().getAttribute("tabindex")).toBe("0");
		rerender(<ClassicyIcon {...props} tabStop={false} />);
		expect(iconRoot().getAttribute("tabindex")).toBe("-1");
	});

	it("reports the pointer's travel to onFileDrag, and outlines fileDragParts", () => {
		const holder = createRef<HTMLDivElement>();
		const parts = vi.fn(() => []);
		const onFileDrag = vi.fn(
			(
				_target: unknown,
				_point: [number, number],
				_outlineTopLeft: [number, number],
				_moved: [number, number],
			) => true,
		);
		const folder = document.createElement("div");
		folder.setAttribute("data-classicy-drop-folder", "Elsewhere");
		render(
			<div ref={holder}>
				<ClassicyIcon
					{...props}
					holder={holder}
					onFileDrag={onFileDrag}
					fileDragParts={parts}
				/>
			</div>,
		);
		const original = document.elementsFromPoint;
		document.elementsFromPoint = () => [folder];
		try {
			fireEvent.mouseDown(iconRoot(), { button: 0, clientX: 10, clientY: 10 });
			// Read when the drag begins, not at the press.
			expect(parts).not.toHaveBeenCalled();
			fireEvent.mouseMove(document, { clientX: 40, clientY: 30 });
			expect(parts).toHaveBeenCalledOnce();
			fireEvent.mouseUp(document, { clientX: 40, clientY: 30 });
		} finally {
			document.elementsFromPoint = original;
		}
		expect(onFileDrag.mock.calls[0][3]).toEqual([30, 20]);
	});

	it("moves by moveBy each time its id changes, never at mount or locked", () => {
		const at = () => [iconRoot().style.left, iconRoot().style.top];
		const { rerender } = render(
			<ClassicyIcon
				{...props}
				initialPosition={[10, 10]}
				moveBy={{ by: [5, 5], id: 1 }}
			/>,
		);
		expect(at()).toEqual(["10px", "10px"]);
		rerender(
			<ClassicyIcon
				{...props}
				initialPosition={[10, 10]}
				moveBy={{ by: [30, 20], id: 2 }}
			/>,
		);
		expect(at()).toEqual(["40px", "30px"]);
		// Snapped onto the grid when it has one.
		rerender(
			<ClassicyIcon
				{...props}
				initialPosition={[10, 10]}
				snapTo={[50, 50]}
				moveBy={{ by: [12, 0], id: 3 }}
			/>,
		);
		expect(at()).toEqual(["50px", "50px"]);
		rerender(
			<ClassicyIcon
				{...props}
				initialPosition={[10, 10]}
				positionLocked
				moveBy={{ by: [100, 100], id: 4 }}
			/>,
		);
		expect(at()).toEqual(["50px", "50px"]);
	});

	it("selects on Space and toggles on Control-Space under Windows' keys, opening on Return alone", () => {
		useWindowsLayout();
		const onClickFunc = vi.fn();
		render(<ClassicyIcon {...props} onClickFunc={onClickFunc} />);
		fireEvent.keyDown(iconRoot(), { key: " " });
		expect(iconRoot()).toHaveClass("selected");
		fireEvent.keyDown(iconRoot(), { key: " " });
		expect(iconRoot()).toHaveClass("selected");
		fireEvent.keyDown(iconRoot(), { key: " ", ctrlKey: true });
		expect(iconRoot()).not.toHaveClass("selected");
		expect(onClickFunc).not.toHaveBeenCalled();
		fireEvent.keyDown(iconRoot(), { key: "Enter" });
		expect(onClickFunc).toHaveBeenCalledOnce();
	});

	it("leaves Space to its caller when controlled, under Windows' keys", () => {
		useWindowsLayout();
		const onClickFunc = vi.fn();
		render(
			<ClassicyIcon {...props} selected={false} onClickFunc={onClickFunc} />,
		);
		expect(fireEvent.keyDown(iconRoot(), { key: " " })).toBe(true);
		expect(onClickFunc).not.toHaveBeenCalled();
	});

	it("opens on Space under the default layout", () => {
		const onClickFunc = vi.fn();
		render(<ClassicyIcon {...props} onClickFunc={onClickFunc} />);
		expect(fireEvent.keyDown(iconRoot(), { key: " " })).toBe(false);
		expect(onClickFunc).toHaveBeenCalledOnce();
	});
});

// An icon's file drag under Windows 98's `layout.transfer` (the remaining
// chapters' audit's 5.33 / 11.7 / A.5 and 5.34 / A.8; WIG Ch.5
// "Nondefault Drag and Drop", pp.62-63; "Shortcut Keys for Transfer
// Operations", pp.67-68): button 2 drags too, ending in the transfer menu,
// whose choice reaches `onFileDrag` with its effect; Control at the
// release copies.
describe("ClassicyIcon — a file drag's transfers", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const useTransferLayout = () =>
		registerClassicyAppearancePackage({
			id: "test-icon-transfer",
			name: "Icon transfer",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "test-icon-transfer-default",
				package: "test-icon-transfer",
			},
			layout: {
				...(windows98.layout as never as Record<string, unknown>),
				transfer: { secondaryButton: "menu", copyModifier: "ctrl" },
			} as never,
		});
	const iconProps = {
		appId: "Test.app",
		name: "Plan",
		icon: "/plan.png",
	};
	const root = () => document.querySelector(".classicyIcon") as HTMLElement;
	const renderIcon = (
		extra: Partial<Parameters<typeof ClassicyIcon>[0]> = {},
	) => {
		const holder = createRef<HTMLDivElement>();
		const onFileDrag = vi.fn(() => true);
		render(
			<ClassicyContextualMenuProvider>
				<div ref={holder}>
					<ClassicyIcon
						{...iconProps}
						holder={holder}
						onFileDrag={onFileDrag}
						{...extra}
					/>
				</div>
			</ClassicyContextualMenuProvider>,
		);
		return { onFileDrag };
	};
	const folder = (path: string) => {
		const el = document.createElement("div");
		el.setAttribute("data-classicy-drop-folder", path);
		return el;
	};
	const drag = (
		target: Element,
		{
			button = 0,
			ctrlKey = false,
		}: { button?: number; ctrlKey?: boolean } = {},
	) => {
		const original = document.elementsFromPoint;
		document.elementsFromPoint = () => [target];
		try {
			fireEvent.mouseDown(root(), { button, clientX: 10, clientY: 10 });
			fireEvent.mouseMove(document, { clientX: 40, clientY: 30, ctrlKey });
			fireEvent.mouseUp(document, {
				button,
				clientX: 40,
				clientY: 30,
				ctrlKey,
			});
		} finally {
			document.elementsFromPoint = original;
		}
	};
	const menuItems = () =>
		[...document.querySelectorAll(".classicyContextMenuWrapper li[id]")].map(
			(li) => li.textContent,
		);

	it("ends a button-2 drag in the transfer menu, whose choice reaches onFileDrag", async () => {
		useTransferLayout();
		const { onFileDrag } = renderIcon();
		drag(folder("Elsewhere"), { button: 2 });
		expect(onFileDrag).not.toHaveBeenCalled();
		expect(menuItems()).toEqual(
			expect.arrayContaining([
				"Move Here",
				"Copy Here",
				"Create Shortcut(s) Here",
				"Cancel",
			]),
		);
		fireEvent.click(
			document.getElementById("classicy_file_drop_link") as HTMLElement,
		);
		await vi.waitFor(() => expect(onFileDrag).toHaveBeenCalledTimes(1));
		const call = onFileDrag.mock.calls[0] as unknown[];
		expect(call[0]).toMatchObject({
			destination: { kind: "folder", path: "Elsewhere" },
		});
		// The pointer's travel at the release.
		expect(call[3]).toEqual([30, 20]);
		expect(call[4]).toBe("link");
	});

	it("offers only the effects fileDropEffects gives", () => {
		useTransferLayout();
		renderIcon({ fileDropEffects: () => ["move"] });
		drag(folder("Elsewhere"), { button: 2 });
		expect(menuItems()).not.toContain("Copy Here");
		expect(menuItems()).toContain("Move Here");
	});

	it("offers a move alone over the Trash without fileDropEffects", () => {
		useTransferLayout();
		renderIcon();
		drag(folder("Trash"), { button: 2 });
		expect(menuItems()).not.toContain("Copy Here");
		expect(menuItems()).not.toContain("Create Shortcut(s) Here");
	});

	it("copies with Control held at the release", () => {
		useTransferLayout();
		const { onFileDrag } = renderIcon();
		drag(folder("Elsewhere"), { ctrlKey: true });
		expect((onFileDrag.mock.calls[0] as unknown[])[4]).toBe("copy");
	});

	it("drags on button 1 alone and moves, without the keys", () => {
		const { onFileDrag } = renderIcon();
		drag(folder("Elsewhere"), { button: 2 });
		expect(onFileDrag).not.toHaveBeenCalled();
		expect(menuItems()).toEqual([]);
		drag(folder("Elsewhere"), { ctrlKey: true });
		expect((onFileDrag.mock.calls[0] as unknown[])[4]).toBe("move");
	});
});

// A shortcut's badge in windows (the audit's 11.2; WIG Ch.11 "Displaying
// Objects", p.230, Figure 11.11): under `layout.icon.aliasBadge`
// "everywhere" an `alias` icon draws its image and the `aliasBadge` art's
// mask pair inside `classicyIconImage`; absent (Mac OS 8: the desktop alone
// badges aliases) or for an icon that is no shortcut, the DOM is as before.
describe("ClassicyIcon — a shortcut's badge (layout.icon.aliasBadge)", () => {
	afterEach(() => resetClassicyAppearancePackagesForTests());
	const BADGE = "data:image/gif;base64,R0lGODlhAQABAAAAACw=#badge";
	const usePackage = (id: string, layout: unknown) => {
		registerClassicyAppearancePackage({
			id,
			name: id,
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: `${id}-default`,
				package: id,
			},
			layout: layout as never,
		});
		registerClassicySystemArt(id, { aliasBadge: BADGE });
	};
	const renderIcon = (alias: boolean) =>
		render(
			<ClassicyIcon
				appId={"Test.app"}
				name={"SimpleText"}
				icon={"data:image/gif;base64,R0lGODlhAQABAAAAACw="}
				alias={alias}
			/>,
		).container.querySelector(".classicyIcon") as HTMLElement;

	it("draws the badge over the image under the Windows 98 layout", () => {
		usePackage("windows-badge", windows98.layout);
		const icon = renderIcon(true);
		const box = icon.querySelector(":scope > .classicyIconImage");
		expect(box).not.toBeNull();
		const pairs = box?.querySelectorAll(":scope > .classicyIconMaskOuter");
		expect(pairs).toHaveLength(2);
		const badge = pairs?.[1] as HTMLElement;
		expect(badge).toHaveClass("classicyIconAliasBadge");
		expect(badge.style.getPropertyValue("--classicy-icon-mask")).toBe(
			`url("${BADGE}")`,
		);
		const img = badge.querySelector("img");
		expect(img?.getAttribute("src")).toBe(BADGE);
		expect(img).toHaveAttribute("aria-hidden", "true");
		expect(img).toHaveAttribute("alt", "");
		// The image is still the icon's first, its alt the name.
		expect(icon.querySelector("img")).toHaveAttribute("alt", "SimpleText");
	});

	it("draws no badge for an icon that is no shortcut", () => {
		usePackage("windows-badge", windows98.layout);
		const icon = renderIcon(false);
		expect(icon.querySelector(".classicyIconImage")).toBeNull();
		expect(icon.querySelector(".classicyIconAliasBadge")).toBeNull();
	});

	it("changes nothing under a layout without the key", () => {
		const { icon: _icon, ...mac } = windows98.layout as Record<string, unknown>;
		usePackage("mac-badge", mac);
		const icon = renderIcon(true);
		expect(icon.querySelector(".classicyIconImage")).toBeNull();
		expect(icon.querySelector(".classicyIconAliasBadge")).toBeNull();
		expect(icon.querySelectorAll(".classicyIconMaskOuter")).toHaveLength(1);
		expect(
			icon.querySelector(":scope > .classicyIconMaskOuter"),
		).not.toBeNull();
	});
});
