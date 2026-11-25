import { useSyncExternalStore } from "react";
import { getClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";
import type { ClassicyIconBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";
import { onClassicyWindowFocusLost } from "@/SystemFolder/SystemResources/File/ClassicyPointerStreamLost.internal";
import {
	isClassicyMenuKeyTarget,
	isClassicyMenuShown,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";

/**
 * What's This?, Windows' context-sensitive Help (WIG Ch.12
 * "Context-Sensitive Help", pp.273-275, Figures 12.1-12.4; App. B Table
 * B.2, p.358), under a package whose layout says `balloonHelp.contextHelp:
 * "whatsThis"` (Windows 98). Without that key every function here does
 * nothing, so Platinum, System 7 and `mirrored` never see the mode.
 *
 * - The help: each element `useClassicyBalloonHelp` describes (an anchor)
 *   is registered with its config (`registerClassicyHelpAnchor`), so the
 *   help a ToolTip shows on hover is the help What's This? shows on a
 *   click.
 * - The mode (`startClassicyWhatsThis`, the command and Shift+F1): a
 *   session-only state, never persisted, shown by the document element's
 *   `classicyWhatsThisMode` class, under which the stylesheets give the
 *   active window the `help` cursor ("Display the context-sensitive Help
 *   pointer only over ... the active window from which the What's This?
 *   command was chosen", p.274). While it is on, a button-1 (or button-2)
 *   press in its scope is swallowed, the rest of that press with it: on an
 *   anchor (the pressed element or its nearest described ancestor) it
 *   shows that help as a pop-up at the press and ends the mode; on nothing
 *   described it keeps the mode ("continue to display the
 *   context-sensitive Help pointer and maintain the context-sensitive Help
 *   mode", p.275). A press on a menu title or item, or button 2 on a
 *   `ClassicyContextualMenuTarget`, passes through and keeps the mode until
 *   the menu it opens closes (p.274: "maintain the mode ... until the user
 *   chooses a menu item or cancels the menu"); Escape, a press outside the
 *   scope (which goes on to what it pressed), the window losing focus, or
 *   the command again ends it (p.275). A control carrying
 *   `CLASSICY_WHATS_THIS_COMMAND_ATTRIBUTE` (the "?" caption box) passes
 *   through too, so its own command ends the mode.
 * - The pop-up (`showClassicyContextHelp`, a contextual "What's This?",
 *   F1): one at a time, drawn by `ClassicyWhatsThisPopup` (which
 *   `ClassicyContextualMenuProvider` mounts) as `classicyBalloonHelp
 *   classicyBalloonHelpContext`, the package drawing Figure 12.3's box.
 *   The next press anywhere, or the next key, closes it and is swallowed,
 *   as WinHelp's pop-up took them; so does the window losing focus.
 *
 * Every listener is on `window` in the capture phase, so a component's own
 * handlers, a dialog's Escape among them, never see what the mode takes.
 * @internal
 */

/** The class on the document element while the mode is on. */
export const CLASSICY_WHATS_THIS_MODE_CLASS = "classicyWhatsThisMode";

/**
 * The attribute a What's This? command's own control carries (the shell's
 * "?" caption box): a press on it while the mode is on passes through, so the
 * command runs again and ends the mode (WIG Ch.12 p.275: "If the user
 * chooses the What's This? command a second time ... cancel the
 * context-sensitive Help mode").
 */
export const CLASSICY_WHATS_THIS_COMMAND_ATTRIBUTE = "data-classicy-whats-this";

// After a swallowed press is released, how long the events that follow its
// release (the `click`, the `contextmenu` a Windows host raises after the
// release) are still swallowed.
const RELEASE_GRACE_MS = 500;

// How many frames after the release of a press that passed through to a
// menu the mode waits for a menu to show before it goes back to taking
// presses (a contextual menu held for the release opens a frame later).
const MENU_WAIT_FRAMES = 3;

/** Where a pop-up opens. */
export type ClassicyContextHelpPlacement =
	| {
			/** At a press: its top at `at`'s y, centered on its x. */
			kind: "point";
			at: [number, number];
	  }
	| {
			/** Below an element (F1, a call with no point), centered on it. */
			kind: "below";
			rect: { left: number; top: number; right: number; bottom: number };
	  };

/** The pop-up shown, one at a time. */
export interface ClassicyContextHelpPopup {
	/** A new id per pop-up, so its host measures it afresh. */
	id: number;
	help: ClassicyIconBalloonHelp;
	placement: ClassicyContextHelpPlacement;
}

interface WhatsThisState {
	active: boolean;
	popup: ClassicyContextHelpPopup | null;
}

let state: WhatsThisState = { active: false, popup: null };
const listeners = new Set<() => void>();
const setState = (next: Partial<WhatsThisState>) => {
	state = { ...state, ...next };
	for (const listener of listeners) listener();
};

/** @internal Subscribes to the mode and the pop-up. */
export const subscribeClassicyWhatsThis = (listener: () => void) => {
	listeners.add(listener);
	return () => {
		listeners.delete(listener);
	};
};

/** Is the What's This? mode on? Store-free, for handlers. */
export const isClassicyWhatsThisActive = (): boolean => state.active;

/** The pop-up shown, or null. */
export const getClassicyContextHelpPopup =
	(): ClassicyContextHelpPopup | null => state.popup;

const getActive = () => state.active;
const getPopup = () => state.popup;

/** Is the What's This? mode on? Re-renders when it starts or ends. */
export const useClassicyWhatsThisActive = (): boolean =>
	useSyncExternalStore(subscribeClassicyWhatsThis, getActive, () => false);

/** The pop-up shown, or null; re-renders when one opens or closes. */
export const useClassicyContextHelpPopup =
	(): ClassicyContextHelpPopup | null =>
		useSyncExternalStore(subscribeClassicyWhatsThis, getPopup, () => null);

/** Is context-sensitive Help on (`balloonHelp.contextHelp` "whatsThis")? */
export const isClassicyContextHelpEnabled = (): boolean =>
	getClassicyAppearanceLayout().balloonHelp?.contextHelp === "whatsThis";

// ---------------------------------------------------------------------------
// The anchors

// Each described element's help, by element: a WeakMap, so an anchor that
// leaves the document is forgotten with it.
const anchors = new WeakMap<Element, ClassicyIconBalloonHelp>();

/**
 * Registers `element` as described by `help` (`useClassicyBalloonHelp` does
 * this for every anchor it is given a config for); returns its removal,
 * which removes only this registration.
 */
export const registerClassicyHelpAnchor = (
	element: Element,
	help: ClassicyIconBalloonHelp,
): (() => void) => {
	anchors.set(element, help);
	return () => {
		if (anchors.get(element) === help) anchors.delete(element);
	};
};

/** The help registered for `element` itself, if any. */
export const classicyHelpAnchorConfig = (
	element: Element,
): ClassicyIconBalloonHelp | undefined => anchors.get(element);

/**
 * The nearest described element from `from` up (itself first), stopping at
 * `within` (inclusive) when given; null when none is.
 */
export const findClassicyHelpAnchor = (
	from: Element | null,
	within?: Element | null,
): HTMLElement | null => {
	for (let el = from; el; el = el.parentElement) {
		if (anchors.has(el) && el instanceof HTMLElement) return el;
		if (el === within) break;
	}
	return null;
};

// ---------------------------------------------------------------------------
// Swallowing a press

let stopSwallowing: (() => void) | null = null;

const SWALLOWED = [
	"mousedown",
	"pointerup",
	"mouseup",
	"click",
	"dblclick",
	"auxclick",
	"contextmenu",
] as const;

const takeEvent = (e: Event) => {
	e.preventDefault();
	e.stopImmediatePropagation();
};

// The rest of the press `press` began, taken from everything else: its
// `mousedown` (no focus moves, no text is selected), its release, its
// `click` (a keyboard click, `detail` 0, is not the press's) and the
// `contextmenu` a button-2 press raises, at the press or after the release.
// It lasts until a moment after the release, or the next press.
const swallowRestOfPress = (press: Event) => {
	stopSwallowing?.();
	let timer: ReturnType<typeof setTimeout> | null = null;
	const onEvent = (e: Event) => {
		if (e.type === "click" && (e as MouseEvent).detail === 0) return;
		takeEvent(e);
		if ((e.type === "pointerup" || e.type === "mouseup") && timer === null)
			timer = setTimeout(end, RELEASE_GRACE_MS);
	};
	const onNextPress = (e: Event) => {
		if (e !== press) end();
	};
	const end = () => {
		if (timer !== null) clearTimeout(timer);
		for (const type of SWALLOWED)
			window.removeEventListener(type, onEvent, true);
		window.removeEventListener("pointerdown", onNextPress, true);
		if (stopSwallowing === end) stopSwallowing = null;
	};
	for (const type of SWALLOWED) window.addEventListener(type, onEvent, true);
	window.addEventListener("pointerdown", onNextPress, true);
	stopSwallowing = end;
};

// ---------------------------------------------------------------------------
// The pop-up

let popupSeq = 0;
let stopPopupListening: (() => void) | null = null;

const MODIFIER_KEYS = new Set([
	"Shift",
	"Control",
	"Alt",
	"Meta",
	"AltGraph",
	"CapsLock",
	"OS",
]);

const closePopup = () => {
	stopPopupListening?.();
	stopPopupListening = null;
	if (state.popup) setState({ popup: null });
};

/** Closes the pop-up What's This? or F1 showed, if one is shown. */
export const hideClassicyContextHelp = (): void => closePopup();

const openPopup = (
	help: ClassicyIconBalloonHelp,
	placement: ClassicyContextHelpPlacement,
) => {
	closePopup();
	const onPress = (e: PointerEvent) => {
		takeEvent(e);
		swallowRestOfPress(e);
		closePopup();
	};
	const onKey = (e: KeyboardEvent) => {
		if (MODIFIER_KEYS.has(e.key)) return;
		takeEvent(e);
		closePopup();
	};
	window.addEventListener("pointerdown", onPress, true);
	window.addEventListener("keydown", onKey, true);
	const stopWatchingFocus = onClassicyWindowFocusLost(closePopup);
	stopPopupListening = () => {
		window.removeEventListener("pointerdown", onPress, true);
		window.removeEventListener("keydown", onKey, true);
		stopWatchingFocus();
	};
	popupSeq += 1;
	setState({ popup: { id: popupSeq, help, placement } });
};

const rectOf = (element: Element) => {
	const { left, top, right, bottom } = element.getBoundingClientRect();
	return { left, top, right, bottom };
};

/**
 * Shows `anchor`'s help (its own, or its nearest described ancestor's) as
 * the context-sensitive Help pop-up at once, ending the mode if it is on: at
 * `at` (viewport `[x, y]`, its top there, centered across it), else below
 * the anchor, centered on it. A contextual "What's This?" item and F1 call
 * it. Does nothing without `balloonHelp.contextHelp` "whatsThis", or when
 * nothing from `anchor` up is described.
 */
export const showClassicyContextHelp = (
	anchor: HTMLElement,
	at?: [number, number],
): void => {
	if (typeof window === "undefined" || !isClassicyContextHelpEnabled()) return;
	const found = findClassicyHelpAnchor(anchor);
	const help = found && anchors.get(found);
	if (!found || !help) return;
	stopClassicyWhatsThis();
	openPopup(
		help,
		at ? { kind: "point", at } : { kind: "below", rect: rectOf(found) },
	);
};

/**
 * Shows the help described for `anchor` below `element` (F1 places it under
 * the focused element, which an anchor may wrap). @internal
 */
export const showClassicyContextHelpBelow = (
	anchor: HTMLElement,
	element: Element,
): void => {
	if (typeof window === "undefined" || !isClassicyContextHelpEnabled()) return;
	const help = anchors.get(anchor);
	if (!help) return;
	stopClassicyWhatsThis();
	openPopup(help, { kind: "below", rect: rectOf(element) });
};

// ---------------------------------------------------------------------------
// The mode

let modeScope: HTMLElement | null = null;
let stopModeListening: (() => void) | null = null;
let contextMenusOpen = 0;

// A press that passed through to a menu: the mode waits, presses going to
// the menu, until the menu closes (then it ends) or, when none showed a few
// frames after the release, goes back to taking presses.
let menuHold: {
	sawMenu: boolean;
	released: boolean;
	framesSinceRelease: number;
	frame: number | null;
} | null = null;

const endMenuHold = () => {
	if (menuHold?.frame != null) cancelAnimationFrame(menuHold.frame);
	menuHold = null;
};

const menuShown = () => contextMenusOpen > 0 || isClassicyMenuShown();

const watchMenu = () => {
	const hold = menuHold;
	if (!hold) return;
	if (menuShown()) hold.sawMenu = true;
	else if (hold.sawMenu) {
		// The menu closed: chosen or canceled, the mode ends with it.
		stopClassicyWhatsThis();
		return;
	} else if (hold.released) {
		hold.framesSinceRelease += 1;
		if (hold.framesSinceRelease > MENU_WAIT_FRAMES) {
			// No menu came: back to taking presses.
			endMenuHold();
			return;
		}
	}
	hold.frame = requestAnimationFrame(watchMenu);
};

const startMenuHold = () => {
	endMenuHold();
	menuHold = {
		sawMenu: menuShown(),
		released: false,
		framesSinceRelease: 0,
		frame: null,
	};
	menuHold.frame = requestAnimationFrame(watchMenu);
};

/**
 * Marks a contextual menu as open (the provider, while it shows one), so a
 * menu the mode passed a press through to holds it whatever the package's
 * menu keyboard; returns the mark's removal, which counts once. @internal
 */
export const markClassicyWhatsThisContextMenuOpen = (): (() => void) => {
	contextMenusOpen += 1;
	let removed = false;
	return () => {
		if (removed) return;
		removed = true;
		contextMenusOpen -= 1;
	};
};

const activeWindowElement = (): HTMLElement | null => {
	const focused = document.activeElement?.closest(".classicyWindow.active");
	if (focused instanceof HTMLElement) return focused;
	return document.querySelector<HTMLElement>(".classicyWindow.active");
};

const isSecondaryPress = (e: PointerEvent) => e.button === 2;

const onModePress = (e: PointerEvent) => {
	const scope = modeScope;
	if (!scope?.isConnected) {
		stopClassicyWhatsThis();
		return;
	}
	// A press passed through to a menu: while the menu is open its presses
	// are its own; once it has closed the mode has ended with it; and while
	// none has shown yet, the press that opens it is still down.
	if (menuHold) {
		if (menuShown()) return;
		if (menuHold.sawMenu) {
			stopClassicyWhatsThis();
			return;
		}
		if (!menuHold.released) return;
		endMenuHold();
	}
	const target = e.target instanceof Element ? e.target : null;
	if (!target) return;
	if (
		isClassicyMenuKeyTarget(target) ||
		(isSecondaryPress(e) &&
			target.closest(".classicyContextualMenuTarget") !== null)
	) {
		startMenuHold();
		return;
	}
	if (!scope.contains(target)) {
		// Outside: the mode ends, and the press goes on to what it pressed.
		stopClassicyWhatsThis();
		return;
	}
	if (target.closest(`[${CLASSICY_WHATS_THIS_COMMAND_ATTRIBUTE}]`)) return;
	takeEvent(e);
	swallowRestOfPress(e);
	const anchor = findClassicyHelpAnchor(target, scope);
	const help = anchor && anchors.get(anchor);
	if (!help) return;
	stopClassicyWhatsThis();
	openPopup(help, { kind: "point", at: [e.clientX, e.clientY] });
};

const onModeRelease = () => {
	if (menuHold) menuHold.released = true;
};

const onModeKey = (e: KeyboardEvent) => {
	if (!modeScope?.isConnected) {
		stopClassicyWhatsThis();
		return;
	}
	// An open menu takes its own Escape; the mode ends when it closes.
	if (e.key !== "Escape" || menuHold) return;
	takeEvent(e);
	stopClassicyWhatsThis();
};

/**
 * Starts the What's This? mode over `scope` (a window's root; by default the
 * active window), or, when it is already on, ends it: the command again
 * cancels it (WIG Ch.12 p.275). Closes a pop-up shown. Does nothing without
 * `balloonHelp.contextHelp` "whatsThis", or with no scope and no active
 * window. The window Help menu's What's This? (⇧F1), the "?" caption box
 * and Shift+F1 call it.
 */
export const startClassicyWhatsThis = (scope?: HTMLElement): void => {
	if (typeof document === "undefined" || !isClassicyContextHelpEnabled())
		return;
	if (state.active) {
		stopClassicyWhatsThis();
		return;
	}
	const target = scope ?? activeWindowElement();
	if (!target) return;
	closePopup();
	modeScope = target;
	document.documentElement.classList.add(CLASSICY_WHATS_THIS_MODE_CLASS);
	window.addEventListener("pointerdown", onModePress, true);
	window.addEventListener("pointerup", onModeRelease, true);
	window.addEventListener("keydown", onModeKey, true);
	const stopWatchingFocus = onClassicyWindowFocusLost(stopClassicyWhatsThis);
	stopModeListening = () => {
		window.removeEventListener("pointerdown", onModePress, true);
		window.removeEventListener("pointerup", onModeRelease, true);
		window.removeEventListener("keydown", onModeKey, true);
		stopWatchingFocus();
	};
	setState({ active: true });
};

/**
 * Ends the What's This? mode, if it is on: the document element loses
 * `classicyWhatsThisMode` and presses go where they would. A pop-up shown
 * stays.
 */
export const stopClassicyWhatsThis = (): void => {
	if (!state.active) return;
	stopModeListening?.();
	stopModeListening = null;
	endMenuHold();
	modeScope = null;
	document.documentElement.classList.remove(CLASSICY_WHATS_THIS_MODE_CLASS);
	setState({ active: false });
};

/** @internal Ends the mode and the pop-up, and forgets a press being swallowed (tests). */
export const resetClassicyWhatsThisForTests = (): void => {
	stopClassicyWhatsThis();
	closePopup();
	stopSwallowing?.();
};

// ---------------------------------------------------------------------------
// Placement

/** A box in viewport coordinates. */
export interface ClassicyContextHelpBox {
	left: number;
	top: number;
	right: number;
	bottom: number;
}

/**
 * Where the pop-up's box (`size`, measured) goes, in whole pixels, as
 * WinHelp placed a pop-up (Wine's winhlp32 `WINHELP_GetPopupWindowInfo`):
 * centered across the press, its top at it (`"point"`), or centered on an
 * element, its top at the element's bottom (`"below"`); moved left to end
 * at the bounds' right edge, never past their left, and above the press or
 * the element where its bottom would pass the bounds', never past their
 * top. Exported for tests: jsdom measures every box as empty.
 */
export const resolveClassicyContextHelpPlacement = (
	placement: ClassicyContextHelpPlacement,
	size: { width: number; height: number },
	bounds: ClassicyContextHelpBox,
): { left: number; top: number } => {
	const centerX =
		placement.kind === "point"
			? placement.at[0]
			: (placement.rect.left + placement.rect.right) / 2;
	const below =
		placement.kind === "point" ? placement.at[1] : placement.rect.bottom;
	const above =
		placement.kind === "point" ? placement.at[1] : placement.rect.top;
	let left = centerX - size.width / 2;
	if (left + size.width > bounds.right) left = bounds.right - size.width;
	if (left < bounds.left) left = bounds.left;
	let top = below;
	if (top + size.height > bounds.bottom) top = above - size.height;
	if (top < bounds.top) top = bounds.top;
	return { left: Math.round(left), top: Math.round(top) };
};

/**
 * The room a pop-up keeps to: the desktop's box where it overlaps the
 * viewport, the viewport alone outside a desktop or while the desktop has
 * no box (jsdom).
 */
export const classicyContextHelpBounds = (): ClassicyContextHelpBox => {
	const viewport = {
		left: 0,
		top: 0,
		right: window.innerWidth,
		bottom: window.innerHeight,
	};
	const rect = document
		.getElementById("classicyDesktop")
		?.getBoundingClientRect();
	if (!rect || rect.width === 0 || rect.height === 0) return viewport;
	return {
		left: Math.max(viewport.left, rect.left),
		top: Math.max(viewport.top, rect.top),
		right: Math.min(viewport.right, rect.right),
		bottom: Math.min(viewport.bottom, rect.bottom),
	};
};
