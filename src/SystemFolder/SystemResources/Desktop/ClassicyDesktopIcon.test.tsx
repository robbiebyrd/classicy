import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@/__tests__/test-utils";
import {
	registerClassicySelectedIconImages,
	registerClassicySystemArt,
	resolveClassicyAsset,
} from "@/Appearance/ClassicyAssetRegistry";
import "../../../../packages/appearance/platinum/src/assets/platinumAssets";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockSelection = vi.hoisted(() => ({ icons: [] as string[] }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Desktop: {
							selectedIcons: mockSelection.icons,
							icons: [{ appId: "TestApp", location: [100, 200] }],
						},
						Applications: {
							apps: {
								"Finder.app": { windows: {} as Record<string, unknown> },
								TestApp: { open: false },
							},
						},
					},
				},
			};
			return selector(mockState);
		},
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss",
	() => ({}),
);

import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";

const defaultProps = {
	appId: "TestApp",
	appName: "Test Application",
	icon: "/icons/test.png",
	kind: "app_shortcut",
};

describe("ClassicyDesktopIcon", () => {
	it("renders icon image with alt text matching appName", () => {
		render(<ClassicyDesktopIcon {...defaultProps} />);
		expect(screen.getByAltText("Test Application")).toBeInTheDocument();
	});

	it("renders appName as label when no label prop is provided", () => {
		render(<ClassicyDesktopIcon {...defaultProps} />);
		expect(screen.getByText("Test Application")).toBeInTheDocument();
	});

	it("renders label text instead of appName when label is provided", () => {
		render(<ClassicyDesktopIcon {...defaultProps} label="My Custom Label" />);
		expect(screen.getByText("My Custom Label")).toBeInTheDocument();
		expect(screen.queryByText("Test Application")).not.toBeInTheDocument();
	});

	it("renders a div with the correct id", () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const div = container.querySelector("#TestApp\\.shortcut");
		expect(div).toBeInTheDocument();
	});

	it("calls dispatch with ClassicyDesktopIconFocus on single click", async () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const iconDiv = container.querySelector(
			"#TestApp\\.shortcut",
		) as HTMLElement;
		mockDispatch.mockClear();
		iconDiv.click();
		expect(mockDispatch).toHaveBeenCalledWith({
			type: "ClassicyDesktopIconFocus",
			iconId: "TestApp",
		});
	});

	it("calls dispatch with ClassicyDesktopIconOpen on double-click", async () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const iconDiv = container.querySelector(
			"#TestApp\\.shortcut",
		) as HTMLElement;
		mockDispatch.mockClear();
		const dblClickEvent = new MouseEvent("dblclick", { bubbles: true });
		iconDiv.dispatchEvent(dblClickEvent);
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyDesktopIconOpen",
				iconId: "TestApp.shortcut",
				app: {
					id: "TestApp",
					name: "Test Application",
					icon: "/icons/test.png",
				},
			}),
		);
	});
});

describe("ClassicyDesktopIcon contextual menu", () => {
	const iconMenu = [{ id: "open", title: "Open Item" }];

	it("shows its per-icon menu on right-click and selects the icon", () => {
		const { container } = render(
			<ClassicyContextualMenuProvider>
				<ClassicyDesktopIcon {...defaultProps} contextMenu={iconMenu} />
			</ClassicyContextualMenuProvider>,
		);
		const iconDiv = container.querySelector(
			"#TestApp\\.shortcut",
		) as HTMLElement;
		mockDispatch.mockClear();
		fireEvent.contextMenu(iconDiv);
		expect(screen.getByText("Open Item")).toBeInTheDocument();
		expect(mockDispatch).toHaveBeenCalledWith({
			type: "ClassicyDesktopIconFocus",
			iconId: "TestApp",
		});
	});

	it("shows nothing on right-click when no menu is defined, but still claims the event", () => {
		const outerHandler = vi.fn();
		const { container } = render(
			<ClassicyContextualMenuProvider>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
				<div onContextMenu={outerHandler}>
					<ClassicyDesktopIcon {...defaultProps} />
				</div>
			</ClassicyContextualMenuProvider>,
		);
		const iconDiv = container.querySelector(
			"#TestApp\\.shortcut",
		) as HTMLElement;
		fireEvent.contextMenu(iconDiv);
		expect(outerHandler).not.toHaveBeenCalled();
		expect(
			document.querySelector(".classicyContextMenuWrapper"),
		).not.toBeInTheDocument();
	});
});

describe("ClassicyDesktopIcon alias badging", () => {
	const badge = (container: HTMLElement) =>
		container.querySelector(".classicyDesktopIconAliasBadge");

	it.each([
		"app_shortcut",
		"shortcut",
	])("badges the %s kind and marks the icon as an alias", (kind) => {
		const { container } = render(
			<ClassicyDesktopIcon {...defaultProps} kind={kind} />,
		);
		expect(badge(container)).toBeInTheDocument();
		expect(
			container.querySelector(".classicyDesktopIconAlias"),
		).toBeInTheDocument();
	});

	it.each([
		"trash",
		"drive",
		"directory",
		"file",
		"icon",
	])("leaves the system kind %s unbadged and unitalicized", (kind) => {
		const { container } = render(
			<ClassicyDesktopIcon {...defaultProps} kind={kind} />,
		);
		expect(badge(container)).not.toBeInTheDocument();
		expect(
			container.querySelector(".classicyDesktopIconAlias"),
		).not.toBeInTheDocument();
	});

	it("gives the badge its own mask pair so it inherits the icon's state styling", () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const badgeEl = badge(container) as HTMLElement;
		expect(badgeEl).toHaveClass("classicyDesktopIconMaskOuter");
		expect(
			badgeEl.querySelector(".classicyDesktopIconMask > img"),
		).toBeInTheDocument();
		expect(badgeEl.style.getPropertyValue("--classicy-icon-mask")).toMatch(
			/^url\(".+"\)$/,
		);
	});

	describe("with a host-registered aliasBadge", () => {
		const platinumAlias = resolveClassicyAsset(
			"systemArt",
			"aliasBadge",
		) as string;
		afterEach(() => {
			registerClassicySystemArt("platinum", { aliasBadge: platinumAlias });
		});

		it("draws the registered artwork on the badge", () => {
			registerClassicySystemArt("platinum", { aliasBadge: "custom.png" });
			const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
			const badgeEl = badge(container) as HTMLElement;
			expect(badgeEl.querySelector("img")).toHaveAttribute("src", "custom.png");
			expect(badgeEl.style.getPropertyValue("--classicy-icon-mask")).toBe(
				'url("custom.png")',
			);
		});

		it("re-renders the badge when the alias is registered after mount", () => {
			const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
			expect(badge(container)?.querySelector("img")).toHaveAttribute(
				"src",
				platinumAlias,
			);
			act(() => {
				registerClassicySystemArt("platinum", { aliasBadge: "later.png" });
			});
			expect(badge(container)?.querySelector("img")).toHaveAttribute(
				"src",
				"later.png",
			);
		});
	});

	it("hides the badge from assistive technology", () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const badgeImg = container.querySelector(
			".classicyDesktopIconAliasBadge img",
		) as HTMLImageElement;
		expect(badgeImg).toHaveAttribute("alt", "");
		expect(badgeImg).toHaveAttribute("aria-hidden", "true");
	});

	it("keeps the icon artwork inside its own wrapper", () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const wrapper = container.querySelector(".classicyDesktopIconImage");
		expect(wrapper).toBeInTheDocument();
		expect(
			wrapper?.querySelector(".classicyDesktopIconMask > img"),
		).toBeInTheDocument();
	});
});

describe("ClassicyDesktopIcon consumer style", () => {
	// Stacking belongs to the icon states (ClassicyDesktopIcon.scss: 10,
	// dragging 500), which no longer win by !important; a consumer zIndex is
	// dropped.
	it("drops a consumer zIndex and keeps the rest", () => {
		const { container } = render(
			<ClassicyDesktopIcon
				{...defaultProps}
				style={{ zIndex: 7, opacity: 0.5 }}
			/>,
		);
		const icon = container.querySelector("#TestApp\\.shortcut") as HTMLElement;
		expect(icon.style.zIndex).toBe("");
		expect(icon.style.opacity).toBe("0.5");
	});
});

// Story 0197-s0z: a selected icon draws the active package's selected image
// for it, when the package registers one (System 7's color icons).
describe("ClassicyDesktopIcon selected image", () => {
	afterEach(() => {
		mockSelection.icons = [];
	});

	it("draws the registered selected image only while selected and loaded, marked", () => {
		// jsdom loads no image: this one loads when the test says so.
		const loads: Array<() => void> = [];
		vi.stubGlobal(
			"Image",
			class {
				onload: (() => void) | null = null;
				onerror: (() => void) | null = null;
				set src(_value: string) {
					loads.push(() => this.onload?.());
				}
			},
		);
		registerClassicySelectedIconImages("platinum", {
			"/icons/test.png": "/icons/test-selected.png",
		});
		const outer = (c: HTMLElement) =>
			c.querySelector(
				".classicyDesktopIconImage > .classicyDesktopIconMaskOuter",
			) as HTMLElement;
		const plain = render(<ClassicyDesktopIcon {...defaultProps} />);
		expect(outer(plain.container).querySelector("img")).toHaveAttribute(
			"src",
			"/icons/test.png",
		);
		expect(outer(plain.container)).not.toHaveClass(
			"classicyDesktopIconSelectedImage",
		);
		plain.unmount();
		mockSelection.icons = ["TestApp"];
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		// Not loaded yet: the plain image, unmarked.
		expect(outer(container).querySelector("img")).toHaveAttribute(
			"src",
			"/icons/test.png",
		);
		act(() => {
			for (const load of loads.splice(0)) load();
		});
		expect(outer(container).querySelector("img")).toHaveAttribute(
			"src",
			"/icons/test-selected.png",
		);
		expect(outer(container)).toHaveClass("classicyDesktopIconSelectedImage");
		vi.unstubAllGlobals();
	});
});

// The mouse under the Windows 98 layout, against the default (Mac OS 8):
// button 2 on a selected icon keeps the whole selection for its menu
// (`selection.secondaryButton` "select", the audit's 5.6; WIG Ch.5
// "Selection with the Mouse", pp.37-38), a non-file icon waits 4 px before
// it moves and only button 1 drags it (`mouse` "windows", 4.9 and 4.10; Ch.4
// "Mouse Actions", pp.24-25), and Escape puts a dragged icon back
// (`input.escapeCancels`, 1.18 / 4.16; Ch.4 "Shortcut Keys", p.27).
describe("ClassicyDesktopIcon — the mouse under the Windows layout", () => {
	afterEach(() => {
		mockSelection.icons = [];
		resetClassicyAppearancePackagesForTests();
	});
	const useWindowsLayout = () =>
		registerClassicyAppearancePackage({
			id: "windows-icons",
			name: "Windows icons",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-icons-default",
				package: "windows-icons",
			},
			layout: windows98.layout as never,
		});
	const iconMenu = [{ id: "open", title: "Open Item" }];
	const renderIcon = () => {
		const view = render(
			<ClassicyContextualMenuProvider>
				<ClassicyDesktopIcon {...defaultProps} contextMenu={iconMenu} />
			</ClassicyContextualMenuProvider>,
		);
		const icon = view.container.querySelector(
			"#TestApp\\.shortcut",
		) as HTMLElement;
		mockDispatch.mockClear();
		return { ...view, icon };
	};
	const dispatched = (type: string) =>
		mockDispatch.mock.calls.filter(([action]) => action.type === type);
	const moves = () =>
		dispatched("ClassicyDesktopIconMove").map(([action]) => action.location);
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

	it("collapses a multiple selection to the icon a right-click lands on, without the key", () => {
		mockSelection.icons = ["TestApp", "OtherApp"];
		const { icon } = renderIcon();
		fireEvent.mouseDown(icon, { button: 2 });
		fireEvent.contextMenu(icon, { button: 2 });
		expect(dispatched("ClassicyDesktopIconFocus")).toEqual([
			[{ type: "ClassicyDesktopIconFocus", iconId: "TestApp" }],
		]);
	});

	it("keeps a multiple selection for the menu of a selected icon under the Windows layout", () => {
		useWindowsLayout();
		mockSelection.icons = ["TestApp", "OtherApp"];
		const { icon } = renderIcon();
		const outer = vi.fn();
		document.addEventListener("contextmenu", outer);
		fireEvent.mouseDown(icon, { button: 2 });
		fireEvent.contextMenu(icon, { button: 2 });
		fireEvent.mouseUp(icon, { button: 2 });
		document.removeEventListener("contextmenu", outer);
		expect(dispatched("ClassicyDesktopIconFocus")).toEqual([]);
		// Still claimed, and focused for the keys, and its menu shown.
		expect(outer).not.toHaveBeenCalled();
		expect(icon).toHaveFocus();
		expect(
			document.querySelector(".classicyContextMenuWrapper")?.textContent,
		).toContain("Open Item");
	});

	it("selects an unselected icon at a button-2 press under the Windows layout", () => {
		useWindowsLayout();
		mockSelection.icons = ["OtherApp"];
		const { icon } = renderIcon();
		fireEvent.mouseDown(icon, { button: 2 });
		expect(dispatched("ClassicyDesktopIconFocus")).toEqual([
			[{ type: "ClassicyDesktopIconFocus", iconId: "TestApp" }],
		]);
	});

	it("moves a non-file icon on the first move without the key", () => {
		const { icon } = renderIcon();
		fireEvent.mouseDown(icon, { button: 0, clientX: 10, clientY: 10 });
		fireEvent.mouseMove(icon, { clientX: 11, clientY: 10 });
		expect(moves()).toEqual([[1, 0]]);
		fireEvent.mouseUp(icon);
	});

	it("moves a non-file icon only once the pointer is 4 px from the press under the Windows layout, keeping the grab", () => {
		useWindowsLayout();
		const { icon } = renderIcon();
		fireEvent.mouseDown(icon, { button: 0, clientX: 10, clientY: 10 });
		fireEvent.mouseMove(icon, { clientX: 12, clientY: 11 });
		fireEvent.mouseMove(icon, { clientX: 13, clientY: 10 });
		expect(moves()).toEqual([]);
		fireEvent.mouseMove(icon, { clientX: 14, clientY: 10 });
		// The pointer less where it grabbed the icon (its box at 0,0 here).
		expect(moves()).toEqual([[4, 0]]);
		// Past it once, every move follows.
		fireEvent.mouseMove(icon, { clientX: 11, clientY: 10 });
		expect(moves()).toEqual([
			[4, 0],
			[1, 0],
		]);
		fireEvent.mouseUp(icon);
	});

	it("drags a non-file icon on button 1 alone under the Windows layout", () => {
		useWindowsLayout();
		const { icon } = renderIcon();
		// The middle button does nothing at all: no selection, no drag.
		fireEvent.mouseDown(icon, { button: 1, clientX: 10, clientY: 10 });
		fireEvent.mouseMove(icon, { clientX: 40, clientY: 40 });
		fireEvent.mouseUp(icon, { button: 1 });
		expect(mockDispatch).not.toHaveBeenCalled();
		// Button 2 selects but does not drag.
		fireEvent.mouseDown(icon, { button: 2, clientX: 10, clientY: 10 });
		fireEvent.mouseMove(icon, { clientX: 40, clientY: 40 });
		fireEvent.mouseUp(icon, { button: 2 });
		expect(dispatched("ClassicyDesktopIconFocus")).toHaveLength(1);
		expect(moves()).toEqual([]);
	});

	it("drags a non-file icon on any button without the key", () => {
		const { icon } = renderIcon();
		fireEvent.mouseDown(icon, { button: 1, clientX: 10, clientY: 10 });
		fireEvent.mouseMove(icon, { clientX: 40, clientY: 40 });
		fireEvent.mouseUp(icon, { button: 1 });
		expect(moves()).toEqual([[30, 30]]);
	});

	it("puts a dragged icon back where the press found it on Escape under the Windows layout", () => {
		useWindowsLayout();
		const { icon } = renderIcon();
		fireEvent.mouseDown(icon, { button: 0, clientX: 10, clientY: 10 });
		fireEvent.mouseMove(icon, { clientX: 60, clientY: 30 });
		expect(pressEscape().defaultPrevented).toBe(true);
		// Back to its stored location (the selection follows it there).
		expect(moves()).toEqual([
			[50, 20],
			[100, 200],
		]);
		expect(icon).not.toHaveClass("dragging");
		// The drag is over: the pointer moving on moves nothing, and the
		// release's click selects nothing.
		fireEvent.mouseMove(icon, { clientX: 90, clientY: 90 });
		fireEvent.mouseUp(icon);
		fireEvent.click(icon);
		expect(moves()).toHaveLength(2);
		expect(dispatched("ClassicyDesktopIconFocus")).toHaveLength(1);
	});

	it("leaves Escape alone mid-drag without the key", () => {
		const { icon } = renderIcon();
		fireEvent.mouseDown(icon, { button: 0, clientX: 10, clientY: 10 });
		fireEvent.mouseMove(icon, { clientX: 60, clientY: 30 });
		expect(pressEscape().defaultPrevented).toBe(false);
		expect(moves()).toEqual([[50, 20]]);
		fireEvent.mouseUp(icon);
	});
});
