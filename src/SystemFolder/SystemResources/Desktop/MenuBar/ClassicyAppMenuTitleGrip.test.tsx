import { act, fireEvent, render } from "@testing-library/react";
import { produce } from "immer";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import {
	dispatch,
	useAppManager,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import {
	CLASSICY_APP_MENU_TITLE_WIDTH_VAR,
	classicyAppMenuShowsNameAfterDrag,
	classicyAppMenuTitleDragWidth,
} from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyAppMenuTitleGrip.internal";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";

// Mac OS 8.5's Application menu title (TN1142, Menu Manager: "It is now
// possible to remove the current application's name from the application
// menu"; observed on Infinite Mac, integration review G round 6, B4): its
// left edge is a grip; dragged, the title follows live, between its icon
// alone and its whole name; let go, a drag right leaves the icon alone and a
// drag left the name, for every application.

function setStore(mutate: (draft: ClassicyStore) => void): void {
	act(() => {
		useAppManager.setState(produce(DefaultAppManagerState, mutate), true);
	});
}

const showsName = () =>
	useAppManager.getState().System.Manager.Desktop.appMenuShowsName;
const grip = () =>
	document.querySelector<HTMLElement>(
		'[data-classicy-part="switcher-grip"]',
	) as HTMLElement;
const title = () =>
	document.querySelector<HTMLElement>(
		'[data-classicy-part="switcher"]',
	) as HTMLElement;
const nav = () =>
	document.querySelector<HTMLElement>(".classicyDesktopMenuBar") as HTMLElement;

describe("the title's width while its grip is dragged", () => {
	it("follows the pointer, from the icon alone to the whole name", () => {
		// The Finder's title (74 px; 29 with its icon alone), as 8.5 draws it.
		expect(classicyAppMenuTitleDragWidth(74, 20, 29, 74)).toBe(54);
		expect(classicyAppMenuTitleDragWidth(74, 60, 29, 74)).toBe(29);
		expect(classicyAppMenuTitleDragWidth(74, -40, 29, 74)).toBe(74);
		expect(classicyAppMenuTitleDragWidth(29, -11, 29, 74)).toBe(40);
	});

	it("shows the icon alone after a drag right, the name after a drag left, and is unchanged after none", () => {
		expect(classicyAppMenuShowsNameAfterDrag(true, 19)).toBe(false);
		expect(classicyAppMenuShowsNameAfterDrag(false, -11)).toBe(true);
		expect(classicyAppMenuShowsNameAfterDrag(true, -5)).toBe(true);
		expect(classicyAppMenuShowsNameAfterDrag(false, 5)).toBe(false);
		expect(classicyAppMenuShowsNameAfterDrag(true, 0)).toBe(true);
		expect(classicyAppMenuShowsNameAfterDrag(false, 0)).toBe(false);
	});
});

describe("the setting", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("is set by ClassicyDesktopSetAppMenuName and ignores a payload without a boolean", () => {
		expect(showsName()).toBeUndefined();
		act(() => {
			dispatch({ type: "ClassicyDesktopSetAppMenuName", showName: false });
		});
		expect(showsName()).toBe(false);
		act(() => {
			dispatch({ type: "ClassicyDesktopSetAppMenuName", showName: "yes" });
		});
		expect(showsName()).toBe(false);
		act(() => {
			dispatch({ type: "ClassicyDesktopSetAppMenuName", showName: true });
		});
		expect(showsName()).toBe(true);
	});

	it("is kept with the desktop state, as every other menu-bar setting is", async () => {
		const { sanitizeStateForPersistence } = await import(
			"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils"
		);
		setStore((draft) => {
			draft.System.Manager.Desktop.appMenuShowsName = false;
		});
		expect(
			sanitizeStateForPersistence(useAppManager.getState()).System.Manager
				.Desktop.appMenuShowsName,
		).toBe(false);
	});
});

describe("the Application menu title and its grip", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("draws the front application's icon and name, and a grip beside it", () => {
		render(<ClassicyDesktopMenuBar />);
		expect(title()).not.toHaveClass("collapsed");
		expect(
			title().querySelector(".classicyDesktopMenuAppSwitcherName")?.textContent,
		).toBe("Finder");
		// The grip is a part of its own, not in the title: a press on it never
		// opens the menu or tears it off.
		expect(grip()).toBeTruthy();
		expect(title().contains(grip())).toBe(false);
		expect(grip()).toHaveAttribute("role", "separator");
		expect(grip()).toHaveAttribute("aria-controls", "app-switcher");
		expect(grip()).toHaveAttribute("aria-valuenow", "100");
		expect(grip()).toHaveAttribute("aria-valuetext", "Name shown");
	});

	// A <ul> holds only <li> (HTML's content model), and a list's role owns
	// listitems: the grip is an item of the bar's list, keeping its
	// separator role (ARIA in HTML allows it on li). Integration review G
	// round 6, finding 1.
	it("is an item of the bar's list, as every child of the bar's <ul> is", () => {
		render(<ClassicyDesktopMenuBar />);
		expect(grip().tagName).toBe("LI");
		expect(grip().parentElement).toHaveClass("classicyDesktopMenu");
		const bar = document.querySelector(".classicyDesktopMenu") as HTMLElement;
		expect(bar.tagName).toBe("UL");
		for (const child of Array.from(bar.children))
			expect(
				`${child.tagName}${child.id ? `#${child.id}` : ""}`,
				child.outerHTML.slice(0, 80),
			).toMatch(/^LI(#|$)|^UL#classicyDesktopMenuExtensions$/);
	});

	it("draws the icon alone for every application when the setting is off, the name its icon's text", () => {
		setStore((draft) => {
			draft.System.Manager.Desktop.appMenuShowsName = false;
		});
		render(<ClassicyDesktopMenuBar />);
		expect(title()).toHaveClass("collapsed");
		expect(title().querySelector("img")).toHaveAttribute("alt", "Finder");
		expect(grip()).toHaveAttribute("aria-valuenow", "0");
		expect(grip()).toHaveAttribute("aria-valuetext", "Icon only");
	});

	it("a drag right leaves the icon alone, the title following the pointer while held", () => {
		render(<ClassicyDesktopMenuBar />);
		const press = fireEvent.mouseDown(grip(), { button: 0, clientX: 100 });
		// The press takes no focus from the front application.
		expect(press).toBe(false);
		expect(grip()).toHaveClass("pressed");
		expect(
			nav().style.getPropertyValue(CLASSICY_APP_MENU_TITLE_WIDTH_VAR),
		).not.toBe("");
		fireEvent.mouseMove(document, { clientX: 119 });
		// Drawn with its name while held, so the drag can cut it.
		expect(title()).not.toHaveClass("collapsed");
		fireEvent.mouseUp(document, { clientX: 119 });
		expect(showsName()).toBe(false);
		expect(title()).toHaveClass("collapsed");
		expect(grip()).not.toHaveClass("pressed");
		// The live width is let go once the title is drawn in its new state.
		expect(
			nav().style.getPropertyValue(CLASSICY_APP_MENU_TITLE_WIDTH_VAR),
		).toBe("");
	});

	it("a drag left shows the name again, and one let go where it was pressed changes nothing", () => {
		setStore((draft) => {
			draft.System.Manager.Desktop.appMenuShowsName = false;
		});
		render(<ClassicyDesktopMenuBar />);
		fireEvent.mouseDown(grip(), { button: 0, clientX: 100 });
		// Held, the title is drawn with its name, cut to the width it is given.
		expect(title()).not.toHaveClass("collapsed");
		fireEvent.mouseUp(document, { clientX: 100 });
		expect(showsName()).toBe(false);
		expect(title()).toHaveClass("collapsed");
		fireEvent.mouseDown(grip(), { button: 0, clientX: 100 });
		fireEvent.mouseMove(document, { clientX: 89 });
		fireEvent.mouseUp(document, { clientX: 89 });
		expect(showsName()).toBe(true);
		expect(title()).not.toHaveClass("collapsed");
	});

	it("Escape cancels a drag", () => {
		render(<ClassicyDesktopMenuBar />);
		fireEvent.mouseDown(grip(), { button: 0, clientX: 100 });
		fireEvent.mouseMove(document, { clientX: 140 });
		fireEvent.keyDown(document, { key: "Escape" });
		expect(grip()).not.toHaveClass("pressed");
		fireEvent.mouseUp(document, { clientX: 140 });
		expect(showsName()).toBeUndefined();
		expect(title()).not.toHaveClass("collapsed");
		expect(
			nav().style.getPropertyValue(CLASSICY_APP_MENU_TITLE_WIDTH_VAR),
		).toBe("");
	});

	it("a lost pointer stream ends the drag where it is, as a release there", () => {
		render(<ClassicyDesktopMenuBar />);
		fireEvent.mouseDown(grip(), { button: 0, clientX: 100 });
		fireEvent.mouseMove(document, { clientX: 130 });
		act(() => {
			window.dispatchEvent(new Event("blur"));
		});
		expect(showsName()).toBe(false);
		expect(grip()).not.toHaveClass("pressed");
	});

	it("a press on the grip closes an open menu", () => {
		render(<ClassicyDesktopMenuBar />);
		const apple = document.querySelector<HTMLElement>(
			'[data-classicy-part="apple"]',
		) as HTMLElement;
		fireEvent.click(apple.querySelector("p") ?? apple);
		expect(apple).toHaveClass("open");
		fireEvent.mouseDown(grip(), { button: 0, clientX: 100 });
		expect(apple).not.toHaveClass("open");
		fireEvent.mouseUp(document, { clientX: 100 });
	});

	it("is a window splitter, out of the Tab order as the bar's titles are: Right Arrow or End the icon alone, Left Arrow or Home the name, Enter toggles", () => {
		render(<ClassicyDesktopMenuBar />);
		// 8.5 gives it no key and no title of the bar is a Tab stop; assistive
		// technology or script may focus it.
		expect(grip()).toHaveAttribute("tabindex", "-1");
		fireEvent.keyDown(grip(), { key: "ArrowRight" });
		expect(showsName()).toBe(false);
		fireEvent.keyDown(grip(), { key: "ArrowLeft" });
		expect(showsName()).toBe(true);
		fireEvent.keyDown(grip(), { key: "End" });
		expect(showsName()).toBe(false);
		fireEvent.keyDown(grip(), { key: "Home" });
		expect(showsName()).toBe(true);
		fireEvent.keyDown(grip(), { key: "Enter" });
		expect(showsName()).toBe(false);
		fireEvent.keyDown(grip(), { key: "Enter" });
		expect(showsName()).toBe(true);
	});
});

// jsdom lays nothing out, so the title's border box is stubbed by the state
// it is drawn in: the Finder's 74 px with its name, 29 with its icon alone
// (8.5's, `appMenuTitle.css.test.ts`). Integration review G round 6,
// finding 4.
describe("the title's live width while the grip is held", () => {
	const FULL = 74;
	const ICON_ONLY = 29;
	let restore: (() => void) | undefined;

	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
		const original = HTMLElement.prototype.getBoundingClientRect;
		HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
			if (this.getAttribute("data-classicy-part") !== "switcher")
				return original.call(this);
			const width = this.classList.contains("collapsed") ? ICON_ONLY : FULL;
			return DOMRect.fromRect({ x: 0, y: 0, width, height: 20 });
		};
		restore = () => {
			HTMLElement.prototype.getBoundingClientRect = original;
		};
	});
	afterEach(() => restore?.());

	const liveWidth = () =>
		nav().style.getPropertyValue(CLASSICY_APP_MENU_TITLE_WIDTH_VAR);

	it("starts at the title's width, follows the pointer and stops at the icon alone and the whole name", () => {
		render(<ClassicyDesktopMenuBar />);
		fireEvent.mouseDown(grip(), { button: 0, clientX: 100 });
		expect(liveWidth()).toBe(`${FULL}px`);
		fireEvent.mouseMove(document, { clientX: 120 });
		expect(liveWidth()).toBe(`${FULL - 20}px`);
		// Past the icon alone: no narrower.
		fireEvent.mouseMove(document, { clientX: 200 });
		expect(liveWidth()).toBe(`${ICON_ONLY}px`);
		// Past the whole name: no wider.
		fireEvent.mouseMove(document, { clientX: 40 });
		expect(liveWidth()).toBe(`${FULL}px`);
		fireEvent.mouseMove(document, { clientX: 111 });
		expect(liveWidth()).toBe(`${FULL - 11}px`);
		fireEvent.mouseUp(document, { clientX: 111 });
		expect(liveWidth()).toBe("");
	});

	it("starts at the icon alone when collapsed, and widens no further than the whole name", () => {
		setStore((draft) => {
			draft.System.Manager.Desktop.appMenuShowsName = false;
		});
		render(<ClassicyDesktopMenuBar />);
		fireEvent.mouseDown(grip(), { button: 0, clientX: 100 });
		expect(liveWidth()).toBe(`${ICON_ONLY}px`);
		fireEvent.mouseMove(document, { clientX: 90 });
		expect(liveWidth()).toBe(`${ICON_ONLY + 10}px`);
		fireEvent.mouseMove(document, { clientX: 0 });
		expect(liveWidth()).toBe(`${FULL}px`);
		fireEvent.mouseMove(document, { clientX: 150 });
		expect(liveWidth()).toBe(`${ICON_ONLY}px`);
		fireEvent.keyDown(document, { key: "Escape" });
		expect(showsName()).toBe(false);
	});

	it("a press of another button starts nothing", () => {
		render(<ClassicyDesktopMenuBar />);
		for (const button of [1, 2]) {
			fireEvent.mouseDown(grip(), { button, clientX: 100 });
			expect(grip()).not.toHaveClass("pressed");
			expect(liveWidth()).toBe("");
			fireEvent.mouseMove(document, { clientX: 140 });
			fireEvent.mouseUp(document, { clientX: 140 });
			expect(showsName()).toBeUndefined();
		}
	});
});
