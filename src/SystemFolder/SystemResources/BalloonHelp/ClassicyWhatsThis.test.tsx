import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The probe package's defaults name Platinum's sound pack.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { ClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp";
import {
	CLASSICY_WHATS_THIS_COMMAND_ATTRIBUTE,
	CLASSICY_WHATS_THIS_MODE_CLASS,
	classicyHelpAnchorConfig,
	findClassicyHelpAnchor,
	getClassicyContextHelpPopup,
	hideClassicyContextHelp,
	isClassicyWhatsThisActive,
	markClassicyWhatsThisContextMenuOpen,
	registerClassicyHelpAnchor,
	resetClassicyWhatsThisForTests,
	resolveClassicyContextHelpPlacement,
	showClassicyContextHelp,
	startClassicyWhatsThis,
	stopClassicyWhatsThis,
	useClassicyWhatsThisActive,
} from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyWhatsThis.internal";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import { ClassicyContextualMenuTarget } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuTarget";

// What's This? (the WIG audit's 12.2, 12.3 and 12.4 / B.5; WIG Ch.12
// "Context-Sensitive Help", pp.273-275, Figures 12.1-12.4), under a probe
// package whose layout says `balloonHelp.contextHelp: "whatsThis"`, and
// nothing under one that does not.

const useWhatsThisLayout = () =>
	registerClassicyAppearancePackage({
		id: "whats-this",
		name: "What's This",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "whats-this-default",
			package: "whats-this",
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			balloonHelp: { contextHelp: "whatsThis" },
		},
	});

const useMacLayout = () =>
	registerClassicyAppearancePackage({
		id: "mac-help",
		name: "Mac help",
		css: "",
		defaults: {
			...CLASSICY_CORE_DEFAULT_THEME,
			id: "mac-help-default",
			package: "mac-help",
		},
		layout: CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	});

afterEach(() => {
	resetClassicyWhatsThisForTests();
	resetClassicyAppearancePackagesForTests();
	vi.useRealTimers();
});

const ActiveFlag = () => (
	<output data-testid="active">{String(useClassicyWhatsThisActive())}</output>
);

// A window holding a described button, a button with no help, a command's
// own control and a contextual-menu target; a button outside it; and a
// menu title.
const renderDesk = (handlers: {
	onDescribed?: () => void;
	onPlain?: () => void;
	onOutside?: () => void;
	onCommand?: () => void;
}) =>
	render(
		<ClassicyContextualMenuProvider>
			<div className="classicyWindow active" data-testid="window">
				<ClassicyBalloonHelp title="Speed" content="Adjusts the speed.">
					<button
						type="button"
						onMouseDown={handlers.onDescribed}
						onClick={handlers.onDescribed}
					>
						described
					</button>
				</ClassicyBalloonHelp>
				<button
					type="button"
					onMouseDown={handlers.onPlain}
					onClick={handlers.onPlain}
				>
					plain
				</button>
				<button
					type="button"
					{...{ [CLASSICY_WHATS_THIS_COMMAND_ATTRIBUTE]: "" }}
					onClick={handlers.onCommand}
				>
					question
				</button>
				<ClassicyContextualMenuTarget menuItems={[{ id: "m", title: "Mine" }]}>
					<span>target</span>
				</ClassicyContextualMenuTarget>
			</div>
			<button type="button" onMouseDown={handlers.onOutside}>
				outside
			</button>
			<ul className="classicyMenuWrapper">
				<li className="classicyMenuItem">File</li>
			</ul>
			<ActiveFlag />
		</ClassicyContextualMenuProvider>,
	);

// A whole press, as a browser sends it.
const press = (
	el: Element,
	init: MouseEventInit & { button?: number } = {},
) => {
	fireEvent.pointerDown(el, { button: 0, clientX: 40, clientY: 50, ...init });
	fireEvent.mouseDown(el, { button: 0, ...init });
	fireEvent.pointerUp(el, { button: 0, ...init });
	fireEvent.mouseUp(el, { button: 0, ...init });
	if ((init.button ?? 0) === 0)
		fireEvent.click(el, { button: 0, detail: 1, ...init });
};

const popup = () => document.querySelector(".classicyBalloonHelpContext");
const html = () => document.documentElement.classList;
const frames = (n: number) =>
	act(() => new Promise((resolve) => setTimeout(resolve, 20 * n)));

describe("What's This? without balloonHelp.contextHelp", () => {
	it("starts no mode and shows no pop-up", () => {
		useMacLayout();
		renderDesk({});
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		expect(isClassicyWhatsThisActive()).toBe(false);
		expect(html().contains(CLASSICY_WHATS_THIS_MODE_CLASS)).toBe(false);
		act(() => showClassicyContextHelp(screen.getByText("described")));
		expect(popup()).toBeNull();
		// A press goes where it always went.
		const onPlain = vi.fn();
		const { unmount } = renderDesk({ onPlain });
		press(screen.getAllByText("plain")[1] as Element);
		expect(onPlain).toHaveBeenCalled();
		unmount();
	});

	it("registers the anchors all the same, which changes nothing on the page", () => {
		useMacLayout();
		renderDesk({});
		const anchor = findClassicyHelpAnchor(screen.getByText("described"));
		expect(anchor).toHaveClass("classicyBalloonHelpAnchor");
		expect(classicyHelpAnchorConfig(anchor as Element)).toMatchObject({
			title: "Speed",
			content: "Adjusts the speed.",
		});
	});
});

describe("What's This? (balloonHelp.contextHelp whatsThis)", () => {
	it("sets the mode on the window, shown on the document element", () => {
		useWhatsThisLayout();
		renderDesk({});
		expect(screen.getByTestId("active")).toHaveTextContent("false");
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		expect(isClassicyWhatsThisActive()).toBe(true);
		expect(html().contains(CLASSICY_WHATS_THIS_MODE_CLASS)).toBe(true);
		expect(screen.getByTestId("active")).toHaveTextContent("true");
		act(() => stopClassicyWhatsThis());
		expect(html().contains(CLASSICY_WHATS_THIS_MODE_CLASS)).toBe(false);
		expect(screen.getByTestId("active")).toHaveTextContent("false");
	});

	it("starts on the active window when given no scope, and not with none", () => {
		useWhatsThisLayout();
		act(() => startClassicyWhatsThis());
		expect(isClassicyWhatsThisActive()).toBe(false);
		renderDesk({});
		act(() => startClassicyWhatsThis());
		expect(isClassicyWhatsThisActive()).toBe(true);
	});

	it("shows a described element's help at the press, swallowing it, and ends the mode", () => {
		useWhatsThisLayout();
		const onDescribed = vi.fn();
		renderDesk({ onDescribed });
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		act(() =>
			press(screen.getByText("described"), { clientX: 120, clientY: 80 }),
		);
		expect(onDescribed).not.toHaveBeenCalled();
		const shown = popup();
		expect(shown).toHaveClass(
			"classicyBalloonHelp",
			"classicyBalloonHelpContext",
		);
		expect(shown).toHaveAttribute("role", "tooltip");
		expect(shown?.querySelector(".classicyBalloonHelpTitle")).toHaveTextContent(
			"Speed",
		);
		expect(
			shown?.querySelector(".classicyBalloonHelpContent"),
		).toHaveTextContent("Adjusts the speed.");
		// At the press: centered across it (jsdom measures it as empty).
		const container = shown?.parentElement as HTMLElement;
		expect(container).toHaveClass("classicyBalloonHelpContainer");
		expect(container.style.left).toBe("120px");
		expect(container.style.top).toBe("80px");
		expect(isClassicyWhatsThisActive()).toBe(false);
		expect(html().contains(CLASSICY_WHATS_THIS_MODE_CLASS)).toBe(false);
	});

	it("keeps the mode on a press on nothing described, swallowing it", () => {
		useWhatsThisLayout();
		const onPlain = vi.fn();
		renderDesk({ onPlain });
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		act(() => press(screen.getByText("plain")));
		expect(onPlain).not.toHaveBeenCalled();
		expect(popup()).toBeNull();
		expect(isClassicyWhatsThisActive()).toBe(true);
	});

	it("treats a button-2 press as button 1's and swallows its contextmenu", () => {
		useWhatsThisLayout();
		renderDesk({});
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		const described = screen.getByText("described");
		act(() => {
			fireEvent.pointerDown(described, { button: 2 });
			fireEvent.mouseDown(described, { button: 2 });
		});
		const menuEvent = new MouseEvent("contextmenu", {
			bubbles: true,
			cancelable: true,
			button: 2,
		});
		const heard = vi.fn();
		document.addEventListener("contextmenu", heard);
		act(() => {
			described.dispatchEvent(menuEvent);
		});
		document.removeEventListener("contextmenu", heard);
		expect(menuEvent.defaultPrevented).toBe(true);
		expect(heard).not.toHaveBeenCalled();
		expect(popup()).not.toBeNull();
	});

	it.each([
		["Escape", () => fireEvent.keyDown(document.body, { key: "Escape" })],
		["the command again", () => startClassicyWhatsThis()],
		["the window losing focus", () => fireEvent.blur(window)],
	])("ends on %s", (_, end) => {
		useWhatsThisLayout();
		renderDesk({});
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		act(() => {
			end();
		});
		expect(isClassicyWhatsThisActive()).toBe(false);
		expect(html().contains(CLASSICY_WHATS_THIS_MODE_CLASS)).toBe(false);
	});

	it("takes the Escape that ends it from everything else", () => {
		useWhatsThisLayout();
		renderDesk({});
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		const heard = vi.fn();
		document.addEventListener("keydown", heard);
		act(() => {
			fireEvent.keyDown(document.body, { key: "Escape" });
		});
		document.removeEventListener("keydown", heard);
		expect(heard).not.toHaveBeenCalled();
	});

	it("ends on a press outside the window, which goes on to what it pressed", () => {
		useWhatsThisLayout();
		const onOutside = vi.fn();
		renderDesk({ onOutside });
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		act(() => press(screen.getByText("outside")));
		expect(onOutside).toHaveBeenCalled();
		expect(isClassicyWhatsThisActive()).toBe(false);
	});

	it("lets the command's own control through, so the command ends the mode", () => {
		useWhatsThisLayout();
		const onCommand = vi.fn(() => startClassicyWhatsThis());
		renderDesk({ onCommand });
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		act(() => press(screen.getByText("question")));
		expect(onCommand).toHaveBeenCalledTimes(1);
		expect(isClassicyWhatsThisActive()).toBe(false);
		expect(popup()).toBeNull();
	});

	it("lets a menu title through and keeps the mode until the menu closes", async () => {
		useWhatsThisLayout();
		renderDesk({});
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		const title = screen.getByText("File");
		const onTitle = vi.fn();
		title.addEventListener("mousedown", onTitle);
		act(() => {
			fireEvent.pointerDown(title, { button: 0 });
			fireEvent.mouseDown(title, { button: 0 });
		});
		expect(onTitle).toHaveBeenCalled();
		// The menu opens; the press inside it is its own.
		const closeMenu = markClassicyWhatsThisContextMenuOpen();
		act(() => {
			fireEvent.pointerUp(title, { button: 0 });
		});
		await frames(2);
		expect(isClassicyWhatsThisActive()).toBe(true);
		const plain = screen.getByText("plain");
		const onPlainDown = vi.fn();
		plain.addEventListener("mousedown", onPlainDown);
		act(() => {
			fireEvent.pointerDown(plain, { button: 0 });
			fireEvent.mouseDown(plain, { button: 0 });
		});
		expect(onPlainDown).toHaveBeenCalled();
		expect(isClassicyWhatsThisActive()).toBe(true);
		// It closes: the mode ends with it.
		closeMenu();
		await vi.waitFor(() => expect(isClassicyWhatsThisActive()).toBe(false));
	});

	it("goes back to taking presses when no menu shows after the title's press", async () => {
		useWhatsThisLayout();
		renderDesk({});
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		act(() => press(screen.getByText("File")));
		await frames(8);
		expect(isClassicyWhatsThisActive()).toBe(true);
		const onPlain = vi.fn();
		const plain = screen.getByText("plain");
		plain.addEventListener("mousedown", onPlain);
		act(() => press(plain));
		expect(onPlain).not.toHaveBeenCalled();
		expect(isClassicyWhatsThisActive()).toBe(true);
	});

	it("lets button 2 open a contextual target's menu, the mode held until it closes", async () => {
		useWhatsThisLayout();
		renderDesk({});
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		const target = screen.getByText("target");
		act(() => {
			fireEvent.pointerDown(target, { button: 2 });
			fireEvent.mouseDown(target, { button: 2 });
			fireEvent.contextMenu(target, { button: 2 });
			fireEvent.pointerUp(target, { button: 2 });
			fireEvent.mouseUp(target, { button: 2 });
		});
		expect(screen.getByText("Mine")).toBeInTheDocument();
		await frames(2);
		expect(isClassicyWhatsThisActive()).toBe(true);
		// Canceled by a press outside it: the mode ends with the menu.
		act(() => {
			fireEvent.mouseDown(document.body);
		});
		expect(screen.queryByText("Mine")).not.toBeInTheDocument();
		await vi.waitFor(() => expect(isClassicyWhatsThisActive()).toBe(false));
	});

	it("ends when its window has left the document", () => {
		useWhatsThisLayout();
		const { unmount } = renderDesk({});
		const scope = screen.getByTestId("window");
		act(() => startClassicyWhatsThis(scope));
		unmount();
		const other = document.createElement("button");
		document.body.append(other);
		act(() => {
			fireEvent.pointerDown(other);
		});
		other.remove();
		expect(isClassicyWhatsThisActive()).toBe(false);
	});
});

describe("the context-sensitive Help pop-up", () => {
	it("shows a target's help at once, ending the mode, and below the anchor with no point", () => {
		useWhatsThisLayout();
		renderDesk({});
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		act(() =>
			showClassicyContextHelp(screen.getByText("described"), [200, 30]),
		);
		expect(isClassicyWhatsThisActive()).toBe(false);
		expect(getClassicyContextHelpPopup()?.placement).toEqual({
			kind: "point",
			at: [200, 30],
		});
		act(() => showClassicyContextHelp(screen.getByText("described")));
		expect(getClassicyContextHelpPopup()?.placement.kind).toBe("below");
		expect(
			document.querySelectorAll(".classicyBalloonHelpContext"),
		).toHaveLength(1);
	});

	it("is drawn once with two providers mounted (two desktops on a page)", () => {
		useWhatsThisLayout();
		renderDesk({});
		render(
			<ClassicyContextualMenuProvider>
				<span>second desktop</span>
			</ClassicyContextualMenuProvider>,
		);
		act(() => showClassicyContextHelp(screen.getByText("described")));
		expect(
			document.querySelectorAll(".classicyBalloonHelpContext"),
		).toHaveLength(1);
	});

	it("does nothing for an element nothing describes", () => {
		useWhatsThisLayout();
		renderDesk({});
		act(() => showClassicyContextHelp(screen.getByText("plain")));
		expect(popup()).toBeNull();
	});

	it("closes on the next press, which it takes", () => {
		useWhatsThisLayout();
		const onPlain = vi.fn();
		renderDesk({ onPlain });
		act(() => showClassicyContextHelp(screen.getByText("described")));
		act(() => press(screen.getByText("plain")));
		expect(popup()).toBeNull();
		expect(onPlain).not.toHaveBeenCalled();
		// The press after it is the page's again.
		act(() => press(screen.getByText("plain")));
		expect(onPlain).toHaveBeenCalled();
	});

	it("closes on the next key, which it takes, but not on a bare modifier", () => {
		useWhatsThisLayout();
		renderDesk({});
		act(() => showClassicyContextHelp(screen.getByText("described")));
		act(() => {
			fireEvent.keyDown(document.body, { key: "Shift" });
		});
		expect(popup()).not.toBeNull();
		const heard = vi.fn();
		document.addEventListener("keydown", heard);
		act(() => {
			fireEvent.keyDown(document.body, { key: "Enter" });
		});
		document.removeEventListener("keydown", heard);
		expect(popup()).toBeNull();
		expect(heard).not.toHaveBeenCalled();
	});

	it("closes when the window loses focus, or when hidden", () => {
		useWhatsThisLayout();
		renderDesk({});
		act(() => showClassicyContextHelp(screen.getByText("described")));
		act(() => {
			fireEvent.blur(window);
		});
		expect(popup()).toBeNull();
		act(() => showClassicyContextHelp(screen.getByText("described")));
		act(() => hideClassicyContextHelp());
		expect(popup()).toBeNull();
	});

	it("starting the mode closes a pop-up shown", () => {
		useWhatsThisLayout();
		renderDesk({});
		act(() => showClassicyContextHelp(screen.getByText("described")));
		act(() => startClassicyWhatsThis(screen.getByTestId("window")));
		expect(popup()).toBeNull();
		expect(isClassicyWhatsThisActive()).toBe(true);
	});
});

describe("the anchors' registry", () => {
	it("finds the nearest described element, itself first, stopping at the scope", () => {
		const outer = document.createElement("div");
		const middle = document.createElement("div");
		const inner = document.createElement("span");
		outer.append(middle);
		middle.append(inner);
		const off = registerClassicyHelpAnchor(outer, { content: "outer" });
		expect(findClassicyHelpAnchor(inner)).toBe(outer);
		expect(findClassicyHelpAnchor(inner, middle)).toBeNull();
		const offMiddle = registerClassicyHelpAnchor(middle, { content: "middle" });
		expect(findClassicyHelpAnchor(inner)).toBe(middle);
		offMiddle();
		expect(findClassicyHelpAnchor(inner)).toBe(outer);
		// A removal removes only its own registration.
		const newer = { content: "newer" };
		registerClassicyHelpAnchor(outer, newer);
		off();
		expect(classicyHelpAnchorConfig(outer)).toBe(newer);
	});
});

describe("resolveClassicyContextHelpPlacement", () => {
	const bounds = { left: 0, top: 20, right: 640, bottom: 480 };
	const size = { width: 200, height: 40 };

	it("centers a press's pop-up across it, its top at the press", () => {
		expect(
			resolveClassicyContextHelpPlacement(
				{ kind: "point", at: [300, 100] },
				size,
				bounds,
			),
		).toEqual({ left: 200, top: 100 });
	});

	it("centers one below an element on it, its top at the element's bottom", () => {
		expect(
			resolveClassicyContextHelpPlacement(
				{
					kind: "below",
					rect: { left: 100, top: 50, right: 300, bottom: 70 },
				},
				size,
				bounds,
			),
		).toEqual({ left: 100, top: 70 });
	});

	it("keeps it inside the bounds: left at the right edge, never past the left, above at the bottom", () => {
		expect(
			resolveClassicyContextHelpPlacement(
				{ kind: "point", at: [630, 460] },
				size,
				bounds,
			),
		).toEqual({ left: 440, top: 420 });
		expect(
			resolveClassicyContextHelpPlacement(
				{ kind: "point", at: [10, 30] },
				size,
				bounds,
			),
		).toEqual({ left: 0, top: 30 });
		expect(
			resolveClassicyContextHelpPlacement(
				{
					kind: "below",
					rect: { left: 100, top: 450, right: 140, bottom: 470 },
				},
				size,
				bounds,
			),
		).toEqual({ left: 20, top: 410 });
		// Taller than the room: pinned at the top.
		expect(
			resolveClassicyContextHelpPlacement(
				{ kind: "point", at: [300, 470] },
				{ width: 100, height: 600 },
				bounds,
			),
		).toEqual({ left: 250, top: 20 });
	});
});
