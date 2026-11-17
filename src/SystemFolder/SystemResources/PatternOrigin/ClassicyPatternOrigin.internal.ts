import { type RefObject, useLayoutEffect, useRef } from "react";
import type {
	ClassicyPatternOrigin,
	ClassicyPatternOriginComponent,
} from "@/Appearance/ClassicyAppearancePackage";
import { useClassicyAppearanceLayout } from "@/Appearance/useClassicyAppearanceLayout";

// A package that fills a part with a pattern in CSS can only lay it from the
// element's own box, so a part's dots fall in a phase set by where it sits.
// QuickDraw laid a pattern from a fixed origin instead: a pixel pattern from
// its window's port (the scroll tracks, `scrollBar.patternOrigin`), a 1-bit
// pattern from the screen's corner (System 7's dimmed controls and dotted
// rules). So the core tells a package where that origin lies from each
// element of the parts it declares (its layout's `patternOrigin`), and of no
// other.
//
// One watcher per window (outside a window, per desktop, else per document
// body) keeps every registered part in it current: a signal that may have
// moved one part may have moved them all, so each publish measures every
// part of the window first and writes after, so no write lays the page out
// again before the next part is read.

/** A point in viewport coordinates. */
type Origin = { x: number; y: number };

/** The two custom properties published on a window-anchored part. */
export const CLASSICY_PATTERN_ORIGIN_X = "--classicy-pattern-origin-x";
export const CLASSICY_PATTERN_ORIGIN_Y = "--classicy-pattern-origin-y";

/**
 * The content origin, in viewport coordinates, of the window holding `el`:
 * inside the window's frame, under its title bar (a title bar not drawn, as
 * a fixed modal's, counts for nothing). Outside a window, the desktop's
 * corner, else the viewport's.
 */
export const classicyWindowContentOrigin = (
	el: Element,
): { x: number; y: number } => {
	const win = el.closest<HTMLElement>(".classicyWindow");
	if (!win) {
		const desktop = el.closest(".classicyDesktop");
		if (!desktop) return { x: 0, y: 0 };
		const r = desktop.getBoundingClientRect();
		return { x: r.left, y: r.top };
	}
	const r = win.getBoundingClientRect();
	const titleBar = win.querySelector(":scope > .classicyWindowTitleBar");
	const drawnBar =
		titleBar !== null && titleBar.getClientRects().length > 0
			? titleBar.getBoundingClientRect()
			: null;
	return {
		x: r.left + win.clientLeft,
		y: drawnBar ? drawnBar.bottom : r.top + win.clientTop,
	};
};

/**
 * The desktop's corner, in viewport coordinates, for `el` (the screen's
 * corner, which System 7 laid its 1-bit patterns from); outside a desktop,
 * the viewport's.
 */
export const classicyDesktopOrigin = (
	el: Element,
): { x: number; y: number } => {
	const desktop = el.closest(".classicyDesktop");
	if (!desktop) return { x: 0, y: 0 };
	const r = desktop.getBoundingClientRect();
	return { x: r.left, y: r.top };
};

/** `value` on the device-pixel grid. */
export const onClassicyDevicePixels = (value: number): number => {
	const ratio =
		typeof window === "undefined" ? 1 : window.devicePixelRatio || 1;
	return Math.round(value * ratio) / ratio;
};

/** A whole-pixel length, as a custom property's value. */
export const classicyOriginPx = (value: number): string =>
	`${Math.round(value)}px`;

/**
 * A part laid from a published origin, as the watcher sees it: the elements
 * whose boxes (and every ancestor's, up to the window) can move it, the
 * origin it is laid from (`window`, the default, or `desktop`), and how to
 * measure it against that origin, in viewport coordinates. `measure` only
 * reads; it returns the writes, which run once every part of the window has
 * been read.
 */
export type ClassicyPatternOriginPart = {
	readonly anchors: readonly HTMLElement[];
	readonly origin?: Exclude<ClassicyPatternOrigin, "element">;
	readonly measure: (origin: Origin) => (() => void) | undefined;
};

/** Events after which a part may have moved against its origin. */
const SETTLE_EVENTS = [
	"scroll",
	"transitionend",
	"transitioncancel",
	"animationend",
	"animationcancel",
];

/** Events after which a stylesheet's `:hover`, `:active` or `:focus` rule
 * may lay a part out anew: read a frame later, once the state has applied. */
const STATE_EVENTS = [
	"pointerover",
	"pointerout",
	"pointerdown",
	"pointerup",
	"focusin",
	"focusout",
];

type Scope = {
	readonly parts: Set<ClassicyPatternOriginPart>;
	readonly observe: (el: Element) => void;
	readonly unobserve: (el: Element) => void;
	readonly publish: () => void;
	readonly originOf: (kind: ClassicyPatternOriginPart["origin"]) => Origin;
	readonly stop: () => void;
};

const scopes = new Map<Element, Scope>();

/** The live watchers' count, for tests. */
export const classicyPatternOriginScopeCountForTests = (): number =>
	scopes.size;

/** What a part is measured against: its window, else its desktop, else the
 * document's body. */
const scopeElementOf = (el: HTMLElement): Element =>
	el.closest(".classicyWindow") ??
	el.closest(".classicyDesktop") ??
	el.ownerDocument.body;

/**
 * The watcher of `scopeEl`, which publishes all its parts again whenever
 * something can have moved one against the origin:
 * - a part, the window, its title bar or any element between them changes
 *   size (a resize moves the far parts; a part above another growing moves
 *   it down);
 * - the DOM inside the window changes (content inserted above a part inside
 *   a container whose box stays put, a class or style moving a part), the
 *   desktop's attributes change (a theme's variables, the package) or a
 *   stylesheet is added, removed or edited;
 * - anything scrolls: inside a window, its own content (a part inside
 *   scrolled content moves with it); outside one, any container or the
 *   document, since the origin (the desktop's corner, else the viewport's)
 *   does not scroll with the part;
 * - a transition or an animation ends, a font finishes loading (text
 *   reflowing above a part) or the viewport resizes (a media query);
 * - the pointer or the focus moves, a frame later (a rule keyed on a
 *   pseudo-class state lays out with no attribute changing).
 * Publishing writes only changed values, so the mutation it makes itself
 * settles after one more read.
 */
const createScope = (scopeEl: Element): Scope => {
	const doc = scopeEl.ownerDocument;
	const view = doc.defaultView;
	const win = scopeEl.matches(".classicyWindow") ? scopeEl : null;
	const desktop = scopeEl.closest<HTMLElement>(".classicyDesktop");
	const parts = new Set<ClassicyPatternOriginPart>();
	const originOf = (kind: ClassicyPatternOriginPart["origin"]) =>
		kind === "desktop"
			? classicyDesktopOrigin(scopeEl)
			: classicyWindowContentOrigin(scopeEl);
	const publish = () => {
		// Each origin read once, then every part read, then written.
		const origins = new Map<ClassicyPatternOriginPart["origin"], Origin>();
		const writes = [...parts].map((part) => {
			let origin = origins.get(part.origin);
			if (!origin) {
				origin = originOf(part.origin);
				origins.set(part.origin, origin);
			}
			return part.measure(origin);
		});
		for (const write of writes) write?.();
	};
	let frame = 0;
	const publishNextFrame = () => {
		if (!view || frame) return;
		frame = view.requestAnimationFrame(() => {
			frame = 0;
			publish();
		});
	};
	const resizes =
		typeof ResizeObserver === "undefined" ? null : new ResizeObserver(publish);
	// Each element a part's chain reaches, with how many chains reach it.
	const observed = new Map<Element, number>();
	const observe = (el: Element) => {
		const count = observed.get(el) ?? 0;
		observed.set(el, count + 1);
		if (count === 0) resizes?.observe(el);
	};
	const unobserve = (el: Element) => {
		const count = observed.get(el) ?? 0;
		if (count <= 1) {
			observed.delete(el);
			resizes?.unobserve(el);
		} else observed.set(el, count - 1);
	};
	const titleBar = win?.querySelector(":scope > .classicyWindowTitleBar");
	if (titleBar) observe(titleBar);
	const mutations =
		typeof MutationObserver === "undefined"
			? null
			: new MutationObserver(publish);
	mutations?.observe(scopeEl, {
		subtree: true,
		childList: true,
		attributes: true,
		characterData: true,
	});
	if (desktop && desktop !== scopeEl)
		mutations?.observe(desktop, { attributes: true });
	if (doc.head)
		mutations?.observe(doc.head, {
			subtree: true,
			childList: true,
			characterData: true,
		});
	// Inside a window, only the window's own events move a part against its
	// origin; outside one, the whole document's.
	const events: EventTarget = win ?? doc;
	for (const type of SETTLE_EVENTS)
		events.addEventListener(type, publish, true);
	for (const type of STATE_EVENTS)
		events.addEventListener(type, publishNextFrame, true);
	view?.addEventListener("resize", publish);
	const fonts = doc.fonts;
	fonts?.addEventListener?.("loadingdone", publish);
	const stop = () => {
		resizes?.disconnect();
		mutations?.disconnect();
		for (const type of SETTLE_EVENTS)
			events.removeEventListener(type, publish, true);
		for (const type of STATE_EVENTS)
			events.removeEventListener(type, publishNextFrame, true);
		view?.removeEventListener("resize", publish);
		fonts?.removeEventListener?.("loadingdone", publish);
		if (frame) view?.cancelAnimationFrame(frame);
	};
	return { parts, observe, unobserve, publish, originOf, stop };
};

/** `anchor` and each ancestor up to its window (outside one, the root). */
const chainOf = (anchor: HTMLElement): Element[] => {
	const win = anchor.closest(".classicyWindow");
	const chain: Element[] = [];
	for (
		let el: Element | null = anchor;
		el;
		el = el === win ? null : el.parentElement
	)
		chain.push(el);
	return chain;
};

/**
 * Registers `part` with its window's watcher (made on the first part, and
 * dropped with the last) and publishes it before returning. Returns the
 * function that unregisters it; the part's own properties are its caller's
 * to remove.
 */
export const watchClassicyPatternOriginPart = (
	part: ClassicyPatternOriginPart,
): (() => void) => {
	const first = part.anchors[0];
	if (!first) return () => {};
	const scopeEl = scopeElementOf(first);
	let scope = scopes.get(scopeEl);
	if (!scope) {
		scope = createScope(scopeEl);
		scopes.set(scopeEl, scope);
	}
	const held = scope;
	const chain = part.anchors.flatMap(chainOf);
	held.parts.add(part);
	for (const el of chain) held.observe(el);
	part.measure(held.originOf(part.origin))?.();
	return () => {
		if (!held.parts.delete(part)) return;
		for (const el of chain) held.unobserve(el);
		if (held.parts.size > 0) return;
		held.stop();
		if (scopes.get(scopeEl) === held) scopes.delete(scopeEl);
	};
};

/** Sets `el`'s two properties to `x`, `y` px, leaving equal values alone. */
const publishPatternOrigin = (el: HTMLElement, x: string, y: string) => {
	if (el.style.getPropertyValue(CLASSICY_PATTERN_ORIGIN_X) !== x)
		el.style.setProperty("--classicy-pattern-origin-x", x);
	if (el.style.getPropertyValue(CLASSICY_PATTERN_ORIGIN_Y) !== y)
		el.style.setProperty("--classicy-pattern-origin-y", y);
};

/**
 * Publishes, on each of `elements`, the `origin` (`window`: the window's
 * content origin; `desktop`: the desktop's corner) from the element's
 * padding-box corner (where a background is laid from by default), in whole
 * pixels, as `--classicy-pattern-origin-x` / `-y`, and keeps it current
 * (`watchClassicyPatternOriginPart`). Returns the function that stops and
 * removes them.
 */
export const watchClassicyPatternOrigin = (
	elements: readonly HTMLElement[],
	origin: Exclude<ClassicyPatternOrigin, "element"> = "window",
): (() => void) => {
	const stop = watchClassicyPatternOriginPart({
		anchors: elements,
		origin,
		measure: (at) => {
			const ox = onClassicyDevicePixels(at.x);
			const oy = onClassicyDevicePixels(at.y);
			const values = elements.map((el) => {
				const r = el.getBoundingClientRect();
				return [
					el,
					classicyOriginPx(ox - onClassicyDevicePixels(r.left) - el.clientLeft),
					classicyOriginPx(oy - onClassicyDevicePixels(r.top) - el.clientTop),
				] as const;
			});
			return () => {
				for (const [el, x, y] of values) publishPatternOrigin(el, x, y);
			};
		},
	});
	return () => {
		stop();
		for (const el of elements) {
			el.style.removeProperty(CLASSICY_PATTERN_ORIGIN_X);
			el.style.removeProperty(CLASSICY_PATTERN_ORIGIN_Y);
		}
	};
};

/**
 * While the active package lays `component`'s patterns from the window or
 * the desktop (`layout.patternOrigin[component]`), publishes that origin on
 * the elements `refs` hold (`watchClassicyPatternOrigin`), registering anew
 * when an element comes or goes (a slider's tick rail) or the origin
 * changes. Otherwise (`element`, or unset) it publishes and watches nothing.
 */
export const useClassicyPatternOrigin = (
	component: ClassicyPatternOriginComponent,
	...refs: RefObject<HTMLElement | null>[]
): void => {
	const declared = useClassicyAppearanceLayout().patternOrigin?.[component];
	const origin =
		declared === "window" || declared === "desktop" ? declared : null;
	const held = useRef<{
		elements: HTMLElement[];
		origin: Exclude<ClassicyPatternOrigin, "element">;
		stop: () => void;
	} | null>(null);
	// After every commit: cheap when nothing changed (the same elements).
	useLayoutEffect(() => {
		const elements = origin
			? refs
					.map((ref) => ref.current)
					.filter((el): el is HTMLElement => el !== null)
			: [];
		const current = held.current;
		if (
			current &&
			current.origin === origin &&
			current.elements.length === elements.length &&
			current.elements.every((el, i) => el === elements[i])
		)
			return;
		current?.stop();
		held.current =
			origin && elements.length > 0
				? {
						elements,
						origin,
						stop: watchClassicyPatternOrigin(elements, origin),
					}
				: null;
	});
	useLayoutEffect(
		() => () => {
			held.current?.stop();
			held.current = null;
		},
		[],
	);
};
