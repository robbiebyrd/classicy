// ClassicyScrollArea draws its own bars beside a native scroll container.
// jsdom lays nothing out, so every extent the component reads is stubbed:
// the viewport's scroll and client sizes and offsets, and the bar parts'
// offsets, which follow the thumb's custom properties as a layout would.
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/useClassicyAppearanceLayout";
import {
	CLASSICY_PART_ATTRIBUTE,
	CLASSICY_STATE,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
// Registers Platinum's sound pack, which the default theme names.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import { getTheme } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyAppearance";
import { ClassicyWindowActiveContext } from "@/SystemFolder/SystemResources/Window/ClassicyWindowActiveContext";
import { ClassicyScrollArea } from "./ClassicyScrollArea";

type Box = {
	scrollWidth: number;
	scrollHeight: number;
	clientWidth: number;
	clientHeight: number;
};

// The viewport's extents, and the bar geometry: a 200 px vertical bar with
// 17 px arrows at either end (split), so a 166 px track 17 px down.
let viewportBox: Box;
const BAR = 17;
const LENGTH = 200;
const scroll = new WeakMap<Element, { top: number; left: number }>();
// How many times the viewport's content height has been read: each
// measurement (`update`) reads it, so this counts layout measurements.
let viewportReads = 0;

const px = (el: HTMLElement, name: string) =>
	Number.parseFloat(el.style.getPropertyValue(name)) || 0;

const has = (el: Element, cls: string) => el.classList.contains(cls);

const geometry: Record<string, (el: HTMLElement) => number> = {
	scrollWidth: (el) =>
		has(el, "classicyScrollAreaViewport") ? viewportBox.scrollWidth : 0,
	scrollHeight: (el) => {
		if (!has(el, "classicyScrollAreaViewport")) return 0;
		viewportReads += 1;
		return viewportBox.scrollHeight;
	},
	clientWidth: (el) =>
		has(el, "classicyScrollAreaViewport") ? viewportBox.clientWidth : 0,
	clientHeight: (el) =>
		has(el, "classicyScrollAreaViewport") ? viewportBox.clientHeight : 0,
	offsetWidth: (el) =>
		has(el, "classicyScrollBarVertical")
			? BAR
			: has(el, "classicyScrollBarHorizontal")
				? LENGTH
				: has(el, "classicyScrollBarTrack")
					? LENGTH - 2 * BAR
					: has(el, "classicyScrollBarThumb")
						? px(el, "--classicy-scroll-thumb-length")
						: 0,
	offsetHeight: (el) =>
		has(el, "classicyScrollBarVertical")
			? LENGTH
			: has(el, "classicyScrollBarHorizontal")
				? BAR
				: has(el, "classicyScrollBarTrack")
					? LENGTH - 2 * BAR
					: has(el, "classicyScrollBarThumb")
						? px(el, "--classicy-scroll-thumb-length")
						: 0,
	offsetTop: (el) =>
		has(el, "classicyScrollBarTrack")
			? BAR
			: has(el, "classicyScrollBarThumb")
				? px(el, "--classicy-scroll-thumb-offset")
				: 0,
	offsetLeft: (el) =>
		has(el, "classicyScrollBarTrack")
			? BAR
			: has(el, "classicyScrollBarThumb")
				? px(el, "--classicy-scroll-thumb-offset")
				: 0,
};

const originals = new Map<string, PropertyDescriptor | undefined>();
beforeEach(() => {
	viewportBox = {
		scrollWidth: 300,
		scrollHeight: 200,
		clientWidth: 300,
		clientHeight: 200,
	};
	for (const [key, get] of Object.entries(geometry)) {
		originals.set(
			key,
			Object.getOwnPropertyDescriptor(HTMLElement.prototype, key) ??
				Object.getOwnPropertyDescriptor(Element.prototype, key),
		);
		Object.defineProperty(HTMLElement.prototype, key, {
			configurable: true,
			get() {
				return get(this as HTMLElement);
			},
		});
	}
	for (const [key, axis] of [
		["scrollTop", "top"],
		["scrollLeft", "left"],
	] as const) {
		originals.set(key, Object.getOwnPropertyDescriptor(Element.prototype, key));
		Object.defineProperty(HTMLElement.prototype, key, {
			configurable: true,
			get() {
				return scroll.get(this as Element)?.[axis] ?? 0;
			},
			set(value: number) {
				const box = viewportBox;
				const max =
					axis === "top"
						? box.scrollHeight - box.clientHeight
						: box.scrollWidth - box.clientWidth;
				const current = scroll.get(this as Element) ?? { top: 0, left: 0 };
				scroll.set(this as Element, {
					...current,
					[axis]: Math.min(Math.max(value, 0), Math.max(max, 0)),
				});
			},
		});
	}
});

afterEach(() => {
	for (const [key, descriptor] of originals) {
		if (descriptor)
			Object.defineProperty(HTMLElement.prototype, key, descriptor);
		else
			delete (HTMLElement.prototype as unknown as Record<string, unknown>)[key];
	}
	originals.clear();
	vi.useRealTimers();
});

const part = (container: HTMLElement, name: string, index = 0) =>
	container.querySelectorAll<HTMLElement>(`[data-classicy-part="${name}"]`)[
		index
	];

const viewportOf = (container: HTMLElement) =>
	container.querySelector(".classicyScrollAreaViewport") as HTMLElement;

const thumbStyle = (thumb: HTMLElement) => ({
	offset: thumb.style.getPropertyValue("--classicy-scroll-thumb-offset"),
	length: thumb.style.getPropertyValue("--classicy-scroll-thumb-length"),
});

// A tall document: 1000 px of content in a 200 px viewport.
const renderTall = (props: Parameters<typeof ClassicyScrollArea>[0] = {}) => {
	viewportBox = {
		scrollWidth: 300,
		scrollHeight: 1000,
		clientWidth: 300,
		clientHeight: 200,
	};
	const view = render(
		<ClassicyScrollArea {...props}>
			<p>Content</p>
		</ClassicyScrollArea>,
	);
	return { ...view, viewport: viewportOf(view.container) };
};

describe("ClassicyScrollArea", () => {
	it("draws no bar while the content fits, and keeps scrolling native", () => {
		const { container } = render(
			<ClassicyScrollArea className="host" style={{ color: "red" }}>
				<p>Content</p>
			</ClassicyScrollArea>,
		);
		const root = container.firstElementChild as HTMLElement;
		expect(root.classList.contains("classicyScrollArea")).toBe(true);
		expect(root.classList.contains("host")).toBe(true);
		expect(root.style.color).toBe("red");
		expect(viewportOf(container).textContent).toBe("Content");
		expect(part(container, "scrollbar")).toBeUndefined();
	});

	it("draws a bar of parts when the content overflows, hidden from AT and focus", () => {
		const { container } = renderTall();
		const bars = container.querySelectorAll('[data-classicy-part="scrollbar"]');
		expect(bars).toHaveLength(1);
		const bar = bars[0] as HTMLElement;
		expect(bar.classList.contains("classicyScrollBarVertical")).toBe(true);
		expect(bar.getAttribute("aria-hidden")).toBe("true");
		for (const name of [
			"scroll-arrow-start",
			"scroll-track",
			"scroll-arrow-end",
			"scroll-thumb",
		]) {
			expect(part(container, name)).toBeDefined();
		}
		expect(bar.querySelector("[tabindex]")).toBeNull();
		expect(bar.hasAttribute("tabindex")).toBe(false);
		// No corner without a second bar.
		expect(part(container, "scroll-corner")).toBeUndefined();
	});

	it("keeps focus where it is on a press (a native bar takes none)", () => {
		const { container } = renderTall();
		const event = new MouseEvent("mousedown", {
			bubbles: true,
			cancelable: true,
		});
		part(container, "scroll-track").dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});

	it("sizes and places the thumb from the content", () => {
		const { container } = renderTall();
		// 200 of 1000 in a 166 px track: 33 px, at the track's start (17).
		expect(thumbStyle(part(container, "scroll-thumb"))).toEqual({
			offset: "17px",
			length: "33px",
		});
		expect(part(container, "scroll-thumb").hidden).toBe(false);
	});

	// A package fixes the thumb's length with min- and max-height (System 7's
	// 16 px scroll box), and the thumb then travels the whole track: the
	// drawn box and the one the bar measures are the same.
	it("keeps the thumb within the package's maximum, and travels the whole track", () => {
		const sheet = document.createElement("style");
		sheet.textContent =
			".classicyScrollBarThumb { min-height: 16px; max-height: 16px; }";
		document.head.append(sheet);
		try {
			viewportBox = {
				scrollWidth: 300,
				scrollHeight: 300,
				clientWidth: 300,
				clientHeight: 200,
			};
			const { container } = render(
				<ClassicyScrollArea>
					<p>Content</p>
				</ClassicyScrollArea>,
			);
			const viewport = viewportOf(container);
			// 200 of 300 would be 111 px; the box is 16.
			expect(thumbStyle(part(container, "scroll-thumb"))).toEqual({
				offset: "17px",
				length: "16px",
			});
			act(() => {
				viewport.scrollTop = 100;
				fireEvent.scroll(viewport);
			});
			// 17 + 150 travel: the track's end.
			expect(thumbStyle(part(container, "scroll-thumb")).offset).toBe("167px");
			// Dragged, the 16 px box follows the pointer over that travel.
			act(() => {
				viewport.scrollTop = 0;
				fireEvent.scroll(viewport);
			});
			const thumb = part(container, "scroll-thumb");
			fireEvent.mouseDown(thumb, { button: 0, clientY: 30 });
			fireEvent.mouseMove(document, { clientY: 105 });
			// 75 of 150 px: half the 100 px range.
			expect(viewport.scrollTop).toBe(50);
			fireEvent.mouseUp(document);
		} finally {
			sheet.remove();
		}
	});

	// Only a pixel length is a limit: a percentage (or any other unit) is
	// relative to a box the bar does not measure, so it counts as unset.
	it("ignores thumb limits that are not pixel lengths", () => {
		const sheet = document.createElement("style");
		sheet.textContent =
			".classicyScrollBarThumb { min-height: 40%; max-height: 10%; }";
		document.head.append(sheet);
		try {
			const { container } = renderTall();
			// 200 of 1000 in a 166 px track: 33 px, neither 40 nor 10.
			expect(thumbStyle(part(container, "scroll-thumb")).length).toBe("33px");
		} finally {
			sheet.remove();
		}
	});

	it("moves the thumb when the content scrolls (wheel, keyboard, script)", () => {
		const { container, viewport } = renderTall();
		act(() => {
			viewport.scrollTop = 400;
			fireEvent.scroll(viewport);
		});
		// 17 + trunc(400 * 133 / 800) = 17 + 66.
		expect(thumbStyle(part(container, "scroll-thumb")).offset).toBe("83px");
	});

	it("follows the content's size as it changes", () => {
		const { container, rerender } = renderTall();
		viewportBox = { ...viewportBox, scrollHeight: 400 };
		rerender(
			<ClassicyScrollArea>
				<p>Shorter</p>
			</ClassicyScrollArea>,
		);
		// 200 of 400: half the track.
		expect(thumbStyle(part(container, "scroll-thumb")).length).toBe("83px");
	});

	it("scrolls a line per arrow press, repeating while held", () => {
		vi.useFakeTimers();
		const { container, viewport } = renderTall({ lineStep: 10 });
		const end = part(container, "scroll-arrow-end");
		fireEvent.mouseDown(end, { button: 0 });
		expect(viewport.scrollTop).toBe(10);
		expect(end.classList.contains(CLASSICY_STATE.pressed)).toBe(true);
		act(() => {
			vi.advanceTimersByTime(120 * 3);
		});
		expect(viewport.scrollTop).toBe(40);
		// Released anywhere: the repeat stops.
		fireEvent.mouseUp(document.body);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(viewport.scrollTop).toBe(40);
		expect(end.classList.contains(CLASSICY_STATE.pressed)).toBe(false);

		fireEvent.mouseDown(part(container, "scroll-arrow-start"), { button: 0 });
		expect(viewport.scrollTop).toBe(30);
		fireEvent.mouseUp(document.body);
	});

	it("stops repeating while the pointer is outside the arrow, resumes on re-entry", () => {
		vi.useFakeTimers();
		const { container, viewport } = renderTall({ lineStep: 10 });
		const end = part(container, "scroll-arrow-end");
		fireEvent.mouseDown(end, { button: 0 });
		act(() => {
			vi.advanceTimersByTime(120);
		});
		expect(viewport.scrollTop).toBe(20);
		fireEvent.mouseLeave(end);
		expect(end.classList.contains(CLASSICY_STATE.pressed)).toBe(false);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(viewport.scrollTop).toBe(20);
		// Back over the arrow, still held: it steps at once and repeats.
		fireEvent.mouseEnter(end);
		expect(viewport.scrollTop).toBe(30);
		expect(end.classList.contains(CLASSICY_STATE.pressed)).toBe(true);
		act(() => {
			vi.advanceTimersByTime(120);
		});
		expect(viewport.scrollTop).toBe(40);
		// Released (anywhere): re-entering no longer scrolls.
		fireEvent.mouseUp(document.body);
		fireEvent.mouseLeave(end);
		fireEvent.mouseEnter(end);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(viewport.scrollTop).toBe(40);
		expect(end.classList.contains(CLASSICY_STATE.pressed)).toBe(false);
	});

	it("does not resume an arrow once the pointer stream is lost", () => {
		vi.useFakeTimers();
		const { container, viewport } = renderTall({ lineStep: 10 });
		const end = part(container, "scroll-arrow-end");
		fireEvent.mouseDown(end, { button: 0 });
		fireEvent.mouseLeave(end);
		act(() => {
			window.dispatchEvent(new Event("blur"));
		});
		fireEvent.mouseEnter(end);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(viewport.scrollTop).toBe(10);
	});

	it("stops paging while the pointer is outside the track, resumes toward it on re-entry", () => {
		vi.useFakeTimers();
		const { container, viewport } = renderTall({ lineStep: 16 });
		const track = part(container, "scroll-track");
		fireEvent.mouseDown(track, { button: 0, clientY: 150 });
		expect(viewport.scrollTop).toBe(184);
		fireEvent.mouseLeave(track);
		expect(track.classList.contains(CLASSICY_STATE.pressed)).toBe(false);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(viewport.scrollTop).toBe(184);
		// Back over the track lower down: pages on toward the new point.
		fireEvent.mouseMove(document, { clientY: 180 });
		fireEvent.mouseEnter(track, { clientY: 180 });
		expect(viewport.scrollTop).toBe(368);
		expect(track.classList.contains(CLASSICY_STATE.pressed)).toBe(true);
		act(() => {
			vi.advanceTimersByTime(120 * 10);
		});
		// 552, 736, then the thumb (139..172) still falls short of 180: 800.
		expect(viewport.scrollTop).toBe(800);
		fireEvent.mouseUp(document.body);
		// Re-entering after the release pages no more.
		fireEvent.mouseLeave(track);
		fireEvent.mouseMove(document, { clientY: 20 });
		fireEvent.mouseEnter(track, { clientY: 20 });
		expect(viewport.scrollTop).toBe(800);
	});

	it("lets a thumb press reach the ancestors' mousedown handlers", () => {
		viewportBox = { ...viewportBox, scrollHeight: 1000 };
		const onMouseDown = vi.fn();
		const { container } = render(
			// biome-ignore lint/a11y/noStaticElementInteractions: test fixture
			<div onMouseDown={onMouseDown}>
				<ClassicyScrollArea>
					<p>Content</p>
				</ClassicyScrollArea>
			</div>,
		);
		fireEvent.mouseDown(part(container, "scroll-thumb"), {
			button: 0,
			clientY: 30,
		});
		expect(onMouseDown).toHaveBeenCalledTimes(1);
		fireEvent.mouseUp(document);
	});

	it("ignores a press with another button", () => {
		const { container, viewport } = renderTall();
		fireEvent.mouseDown(part(container, "scroll-arrow-end"), { button: 2 });
		expect(viewport.scrollTop).toBe(0);
	});

	it("pages toward the pointer while the track is held, stopping at the thumb", () => {
		vi.useFakeTimers();
		const { container, viewport } = renderTall({ lineStep: 16 });
		const track = part(container, "scroll-track");
		// The bar's top is at 0, so the pointer is 150 px down the bar.
		fireEvent.mouseDown(track, { button: 0, clientY: 150 });
		// A page is the viewport less a line: 184.
		expect(viewport.scrollTop).toBe(184);
		expect(track.classList.contains(CLASSICY_STATE.pressed)).toBe(true);
		act(() => {
			vi.advanceTimersByTime(120 * 10);
		});
		// 184, 368, 552, 736: the thumb (139..172) then covers the pointer.
		expect(viewport.scrollTop).toBe(736);
		expect(track.classList.contains(CLASSICY_STATE.pressed)).toBe(false);
	});

	it("pages back up when pressed above the thumb", () => {
		vi.useFakeTimers();
		const { container, viewport } = renderTall();
		act(() => {
			viewport.scrollTop = 800;
			fireEvent.scroll(viewport);
		});
		fireEvent.mouseDown(part(container, "scroll-track"), {
			button: 0,
			clientY: 20,
		});
		expect(viewport.scrollTop).toBe(616);
		fireEvent.mouseUp(document.body);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(viewport.scrollTop).toBe(616);
	});

	it("scrolls in proportion while the thumb is dragged, until released", () => {
		const { container, viewport } = renderTall();
		const thumb = part(container, "scroll-thumb");
		fireEvent.mouseDown(thumb, { button: 0, clientY: 30 });
		expect(thumb.classList.contains(CLASSICY_STATE.dragging)).toBe(true);
		// 133 px of travel scroll 800: 66.5 px is halfway.
		fireEvent.mouseMove(document, { clientY: 96.5 });
		expect(viewport.scrollTop).toBe(400);
		expect(thumbStyle(thumb).offset).toBe("83px");
		fireEvent.mouseMove(document, { clientY: 1000 });
		expect(viewport.scrollTop).toBe(800);
		fireEvent.mouseUp(document);
		expect(thumb.classList.contains(CLASSICY_STATE.dragging)).toBe(false);
		fireEvent.mouseMove(document, { clientY: 30 });
		expect(viewport.scrollTop).toBe(800);
	});

	it("ends a thumb drag where it is when the pointer stream is lost", () => {
		const { container, viewport } = renderTall();
		const thumb = part(container, "scroll-thumb");
		fireEvent.mouseDown(thumb, { button: 0, clientY: 30 });
		fireEvent.mouseMove(document, { clientY: 96.5 });
		act(() => {
			window.dispatchEvent(new Event("blur"));
		});
		expect(thumb.classList.contains(CLASSICY_STATE.dragging)).toBe(false);
		fireEvent.mouseMove(document, { clientY: 200 });
		expect(viewport.scrollTop).toBe(400);
	});

	it("stops a held arrow when the pointer stream is lost", () => {
		vi.useFakeTimers();
		const { container, viewport } = renderTall({ lineStep: 10 });
		fireEvent.mouseDown(part(container, "scroll-arrow-end"), { button: 0 });
		act(() => {
			document.dispatchEvent(new Event("pointercancel"));
			vi.advanceTimersByTime(1000);
		});
		expect(viewport.scrollTop).toBe(10);
	});

	it("marks a bar whose content fits: no thumb", () => {
		// Paired bars over content that is only too tall: the horizontal bar
		// is drawn empty.
		viewportBox = {
			scrollWidth: 300,
			scrollHeight: 1000,
			clientWidth: 300,
			clientHeight: 200,
		};
		const { container } = render(
			<ClassicyScrollArea pairBars>
				<p>Content</p>
			</ClassicyScrollArea>,
		);
		const vertical = container.querySelector(".classicyScrollBarVertical");
		const horizontal = container.querySelector(
			".classicyScrollBarHorizontal",
		) as HTMLElement;
		expect(vertical?.classList.contains(CLASSICY_STATE.fits)).toBe(false);
		expect(horizontal.classList.contains(CLASSICY_STATE.fits)).toBe(true);
		expect(
			(horizontal.querySelector(".classicyScrollBarThumb") as HTMLElement)
				.hidden,
		).toBe(true);
		// Both bars: the corner where they meet.
		expect(part(container, "scroll-corner")).toBeDefined();
	});

	it("draws `always` bars empty while nothing overflows", () => {
		const { container } = render(
			<ClassicyScrollArea vertical="always" horizontal="never">
				<p>Content</p>
			</ClassicyScrollArea>,
		);
		const bar = part(container, "scrollbar");
		expect(bar.classList.contains(CLASSICY_STATE.fits)).toBe(true);
		expect(
			container.querySelectorAll('[data-classicy-part="scrollbar"]'),
		).toHaveLength(1);
	});

	it("clips instead of scrolling when not scrollable", () => {
		const { container } = renderTall({ scrollable: false });
		expect(part(container, "scrollbar")).toBeUndefined();
		expect(
			viewportOf(container).classList.contains(
				"classicyScrollAreaViewportClipped",
			),
		).toBe(true);
	});

	it("is inactive with its window, or when told", () => {
		viewportBox = { ...viewportBox, scrollHeight: 1000 };
		const { container, rerender } = render(
			<ClassicyWindowActiveContext.Provider value={false}>
				<ClassicyScrollArea>
					<p>Content</p>
				</ClassicyScrollArea>
			</ClassicyWindowActiveContext.Provider>,
		);
		const root = container.firstElementChild as HTMLElement;
		expect(root.classList.contains(CLASSICY_STATE.inactive)).toBe(true);
		expect(
			part(container, "scrollbar").classList.contains(CLASSICY_STATE.inactive),
		).toBe(true);
		rerender(
			<ClassicyWindowActiveContext.Provider value={true}>
				<ClassicyScrollArea>
					<p>Content</p>
				</ClassicyScrollArea>
			</ClassicyWindowActiveContext.Provider>,
		);
		expect(root.classList.contains(CLASSICY_STATE.inactive)).toBe(false);
		expect(
			part(container, "scrollbar").classList.contains(CLASSICY_STATE.inactive),
		).toBe(false);
		rerender(
			<ClassicyWindowActiveContext.Provider value={true}>
				<ClassicyScrollArea inactive>
					<p>Content</p>
				</ClassicyScrollArea>
			</ClassicyWindowActiveContext.Provider>,
		);
		expect(root.classList.contains(CLASSICY_STATE.inactive)).toBe(true);
	});

	it("scrolls for a focused root's paging keys that its own handler leaves", () => {
		const onKeyDown = vi.fn(
			(e: { key: string; preventDefault: () => void }) => {
				if (e.key === "ArrowDown") e.preventDefault();
			},
		);
		const { container, viewport } = renderTall({
			tabIndex: 0,
			lineStep: 10,
			onKeyDown,
		});
		const root = container.firstElementChild as HTMLElement;
		fireEvent.keyDown(root, { key: "PageDown" });
		expect(viewport.scrollTop).toBe(190);
		// The caller's handler took the arrow: no scroll.
		fireEvent.keyDown(root, { key: "ArrowDown" });
		expect(viewport.scrollTop).toBe(190);
		expect(onKeyDown).toHaveBeenCalledTimes(2);
		fireEvent.keyDown(root, { key: "End" });
		expect(viewport.scrollTop).toBe(800);
		fireEvent.keyDown(root, { key: " ", shiftKey: true });
		expect(viewport.scrollTop).toBe(610);
		// A key from inside the viewport scrolls natively, not here.
		fireEvent.keyDown(viewport, { key: "PageDown" });
		expect(viewport.scrollTop).toBe(610);
	});

	it("takes a scroller of the caller's own as the viewport (a text area)", () => {
		viewportBox = { ...viewportBox, scrollHeight: 1000 };
		const { container } = render(
			<ClassicyScrollArea
				renderViewport={(viewport) => (
					<textarea
						ref={viewport.ref}
						className={viewport.className}
						onScroll={viewport.onScroll}
						defaultValue="text"
					/>
				)}
			/>,
		);
		const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
		expect(textarea.classList.contains("classicyScrollAreaViewport")).toBe(
			true,
		);
		expect(part(container, "scrollbar")).toBeDefined();
		act(() => {
			textarea.scrollTop = 400;
			fireEvent.scroll(textarea);
		});
		expect(thumbStyle(part(container, "scroll-thumb")).offset).toBe("83px");
		// Typing changes no element: the bars still follow.
		viewportBox = { ...viewportBox, scrollHeight: 200 };
		act(() => {
			fireEvent.input(textarea);
		});
		expect(part(container, "scrollbar")).toBeUndefined();
	});

	it("passes the viewport ref and props through", () => {
		const ref = { current: null as HTMLDivElement | null };
		const { container } = render(
			<ClassicyScrollArea
				viewportRef={ref}
				viewportClassName="mine"
				viewportProps={{ role: "region", "aria-label": "Notes" }}
			>
				<p>Content</p>
			</ClassicyScrollArea>,
		);
		const viewport = viewportOf(container);
		expect(ref.current).toBe(viewport);
		expect(viewport.classList.contains("mine")).toBe(true);
		expect(viewport.getAttribute("role")).toBe("region");
	});
});

// Plan 0018-dbd task 1.5's deferred items (story 0208-m1n).
describe("ClassicyScrollArea internals", () => {
	// The reads one measurement makes, from a scroll that changes nothing
	// (no state change, so no render follows).
	const readsPerMeasure = (viewport: HTMLElement) => {
		viewportReads = 0;
		act(() => {
			fireEvent.scroll(viewport);
		});
		return viewportReads;
	};

	it("measures once per scroll, not again on the render the scroll causes", () => {
		const { container, viewport } = renderTall();
		const once = readsPerMeasure(viewport);
		expect(once).toBeGreaterThan(0);
		viewportReads = 0;
		act(() => {
			viewport.scrollTop = 400;
			fireEvent.scroll(viewport);
		});
		// The thumb moved (a render), measured once.
		expect(thumbStyle(part(container, "scroll-thumb")).offset).toBe("83px");
		expect(viewportReads).toBe(once);
	});

	it("still measures on a render it did not cause (a policy change)", () => {
		const { container, rerender } = renderTall();
		expect(part(container, "scrollbar")).toBeDefined();
		rerender(
			<ClassicyScrollArea vertical="never">
				<p>Content</p>
			</ClassicyScrollArea>,
		);
		expect(part(container, "scrollbar")).toBeUndefined();
	});

	it("measures for attribute changes that can move the content, not for the others", async () => {
		const { viewport } = renderTall();
		const once = readsPerMeasure(viewport);
		const p = viewport.querySelector("p") as HTMLElement;
		const mutate = async (change: () => void) => {
			viewportReads = 0;
			await act(async () => {
				change();
				// MutationObserver callbacks run as a microtask.
				await Promise.resolve();
			});
			return viewportReads;
		};
		expect(await mutate(() => p.setAttribute("aria-selected", "true"))).toBe(0);
		expect(await mutate(() => p.setAttribute("tabindex", "0"))).toBe(0);
		expect(await mutate(() => p.setAttribute("data-x", "1"))).toBe(0);
		expect(await mutate(() => p.setAttribute("class", "wide"))).toBe(once);
		expect(await mutate(() => p.setAttribute("style", "height: 9px"))).toBe(
			once,
		);
		expect(await mutate(() => p.setAttribute("hidden", ""))).toBe(once);
		expect(await mutate(() => p.append(document.createElement("span")))).toBe(
			once,
		);
	});

	it("leaves text changes to the ResizeObserver where there is one", async () => {
		const observed: Element[] = [];
		vi.stubGlobal(
			"ResizeObserver",
			class {
				observe(el: Element) {
					observed.push(el);
				}
				disconnect() {}
				unobserve() {}
			},
		);
		try {
			const { viewport } = renderTall();
			// The viewport and its children are watched for size.
			expect(observed).toContain(viewport);
			expect(observed).toContain(viewport.querySelector("p"));
			const text = viewport.querySelector("p")?.firstChild as Text;
			viewportReads = 0;
			await act(async () => {
				text.data = "Longer content";
				await Promise.resolve();
			});
			expect(viewportReads).toBe(0);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("watches text changes itself where there is no ResizeObserver", async () => {
		const { viewport } = renderTall();
		const once = readsPerMeasure(viewport);
		const text = viewport.querySelector("p")?.firstChild as Text;
		viewportReads = 0;
		await act(async () => {
			text.data = "Longer content";
			await Promise.resolve();
		});
		expect(viewportReads).toBe(once);
	});

	it("follows a caller's scroller that is replaced by another", () => {
		viewportBox = { ...viewportBox, scrollHeight: 1000 };
		const area = (key: string) => (
			<ClassicyScrollArea
				renderViewport={(viewport) => (
					<textarea
						key={key}
						ref={viewport.ref}
						className={viewport.className}
						onScroll={viewport.onScroll}
						defaultValue={key}
					/>
				)}
			/>
		);
		const { container, rerender } = render(area("first"));
		rerender(area("second"));
		const textarea = container.querySelector("textarea") as HTMLTextAreaElement;
		expect(textarea.defaultValue).toBe("second");
		expect(part(container, "scrollbar")).toBeDefined();
		// Typing in the new one (no render, no element change) still updates
		// the bars: its listeners moved with it.
		viewportBox = { ...viewportBox, scrollHeight: 200 };
		act(() => {
			fireEvent.input(textarea);
		});
		expect(part(container, "scrollbar")).toBeUndefined();
	});

	it("hands a caller's text area to its viewport ref", () => {
		const ref = { current: null as HTMLTextAreaElement | null };
		const { container } = render(
			<ClassicyScrollArea
				viewportRef={ref}
				renderViewport={(viewport) => (
					<textarea
						ref={viewport.ref}
						className={viewport.className}
						onScroll={viewport.onScroll}
					/>
				)}
			/>,
		);
		expect(ref.current).toBe(container.querySelector("textarea"));
	});

	it("pages toward where the pointer comes back over the track", () => {
		vi.useFakeTimers();
		const { container, viewport } = renderTall({ lineStep: 16 });
		const track = part(container, "scroll-track");
		fireEvent.mouseDown(track, { button: 0, clientY: 150 });
		expect(viewport.scrollTop).toBe(184);
		fireEvent.mouseLeave(track);
		// Back over the track above the thumb, with no move reported first.
		fireEvent.mouseEnter(track, { clientY: 20 });
		expect(viewport.scrollTop).toBe(0);
		fireEvent.mouseUp(document.body);
	});

	it("stops paging the track when the pointer stream is lost", () => {
		vi.useFakeTimers();
		const { container, viewport } = renderTall({ lineStep: 16 });
		const track = part(container, "scroll-track");
		fireEvent.mouseDown(track, { button: 0, clientY: 180 });
		expect(viewport.scrollTop).toBe(184);
		act(() => {
			window.dispatchEvent(new Event("blur"));
		});
		expect(track.classList.contains(CLASSICY_STATE.pressed)).toBe(false);
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(viewport.scrollTop).toBe(184);
		// Nor does coming back over the track resume it.
		fireEvent.mouseLeave(track);
		fireEvent.mouseEnter(track, { clientY: 180 });
		act(() => {
			vi.advanceTimersByTime(1000);
		});
		expect(viewport.scrollTop).toBe(184);
	});
});

// A package that declares `layout.scrollBar.thumbDrag: "onRelease"`
// (System 7, HIG p.165): the box stays put while a drag outline follows the
// pointer, and the content scrolls on release.
const ON_RELEASE_PACKAGE = "test-on-release";
const registerOnReleasePackage = () =>
	registerClassicyAppearancePackage({
		id: ON_RELEASE_PACKAGE,
		name: "On Release",
		css: "",
		defaults: {
			...getTheme("default"),
			id: "test-on-release-default",
			package: ON_RELEASE_PACKAGE,
		},
		layout: {
			...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
			scrollBar: { thumbDrag: "onRelease" },
		},
	});

// The vertical bar's box on screen: 17 px wide at x 100, 200 px tall at y 0.
const placeBar = (container: HTMLElement) => {
	const bar = part(container, "scrollbar");
	vi.spyOn(bar, "getBoundingClientRect").mockReturnValue(
		DOMRect.fromRect({ x: 100, y: 0, width: BAR, height: LENGTH }),
	);
	return bar;
};

const outlineStyle = (outline: HTMLElement) => ({
	offset: outline.style.getPropertyValue("--classicy-scroll-outline-offset"),
	length: outline.style.getPropertyValue("--classicy-scroll-outline-length"),
});

describe("ClassicyScrollArea thumb drag on release", () => {
	let sheet: HTMLStyleElement;
	beforeEach(() => {
		resetClassicyAppearancePackagesForTests();
		registerOnReleasePackage();
		// The package's snap-back distance, a theme variable (System 7's
		// `scrollBar.snapBack` knob).
		sheet = document.createElement("style");
		sheet.textContent = ".classicyScrollBar { --scroll-bar-snap-back: 20px; }";
		document.head.append(sheet);
	});
	afterEach(() => {
		sheet.remove();
		resetClassicyAppearancePackagesForTests();
	});

	it("leaves the thumb in place while a drag outline follows the pointer, and scrolls on release", () => {
		const { container, viewport } = renderTall();
		placeBar(container);
		const thumb = part(container, "scroll-thumb");
		expect(part(container, "scroll-drag-outline")).toBeUndefined();
		fireEvent.mouseDown(thumb, { button: 0, clientX: 108, clientY: 30 });
		expect(thumb.classList.contains(CLASSICY_STATE.dragging)).toBe(true);
		const outline = part(container, "scroll-drag-outline");
		expect(outline.getAttribute("aria-hidden")).toBe("true");
		expect(outline.classList.contains("classicyScrollBarDragOutline")).toBe(
			true,
		);
		// Over the box at the press.
		expect(outlineStyle(outline)).toEqual({ offset: "17px", length: "33px" });
		fireEvent.mouseMove(document, { clientX: 108, clientY: 96.5 });
		// The content and the box stay put; the outline is 66.5 px down,
		// drawn on a whole pixel.
		expect(viewport.scrollTop).toBe(0);
		expect(thumbStyle(thumb).offset).toBe("17px");
		expect(outlineStyle(outline).offset).toBe("84px");
		// It stops at the track's end, as the box would (15 px below the bar
		// is near enough to follow).
		fireEvent.mouseMove(document, { clientX: 108, clientY: 215 });
		expect(outlineStyle(outline).offset).toBe("150px");
		fireEvent.mouseMove(document, { clientX: 108, clientY: 96.5 });
		fireEvent.mouseUp(document, { clientX: 108, clientY: 96.5 });
		// Released halfway along the 133 px travel: half the 800 px range,
		// as a live drag to the same point scrolls.
		expect(viewport.scrollTop).toBe(400);
		expect(thumbStyle(thumb).offset).toBe("83px");
		expect(thumb.classList.contains(CLASSICY_STATE.dragging)).toBe(false);
		expect(part(container, "scroll-drag-outline")).toBeUndefined();
		fireEvent.mouseMove(document, { clientX: 108, clientY: 30 });
		expect(viewport.scrollTop).toBe(400);
	});

	it("scrolls nothing when released where it was pressed", () => {
		const { container, viewport } = renderTall();
		placeBar(container);
		act(() => {
			viewport.scrollTop = 37;
			fireEvent.scroll(viewport);
		});
		fireEvent.mouseDown(part(container, "scroll-thumb"), {
			button: 0,
			clientX: 108,
			clientY: 30,
		});
		fireEvent.mouseUp(document, { clientX: 108, clientY: 30 });
		expect(viewport.scrollTop).toBe(37);
	});

	it("snaps the outline back past the package's distance from the bar, and scrolls nothing released there", () => {
		const { container, viewport } = renderTall();
		placeBar(container);
		fireEvent.mouseDown(part(container, "scroll-thumb"), {
			button: 0,
			clientX: 108,
			clientY: 30,
		});
		const outline = part(container, "scroll-drag-outline");
		// 20 px right of the bar's right edge (117) still follows.
		fireEvent.mouseMove(document, { clientX: 137, clientY: 96.5 });
		expect(outlineStyle(outline).offset).toBe("84px");
		// One more pixel out: back over the box.
		fireEvent.mouseMove(document, { clientX: 138, clientY: 96.5 });
		expect(outlineStyle(outline).offset).toBe("17px");
		fireEvent.mouseUp(document, { clientX: 138, clientY: 96.5 });
		expect(viewport.scrollTop).toBe(0);
		expect(part(container, "scroll-drag-outline")).toBeUndefined();
	});

	it("snaps back on every side of the bar", () => {
		const { container } = renderTall();
		placeBar(container);
		fireEvent.mouseDown(part(container, "scroll-thumb"), {
			button: 0,
			clientX: 108,
			clientY: 30,
		});
		const outline = part(container, "scroll-drag-outline");
		for (const [clientX, clientY, offset] of [
			[80, 96.5, "84px"],
			[79, 96.5, "17px"],
			[108, -20, "17px"],
			[108, -21, "17px"],
			[108, 220, "150px"],
			[108, 221, "17px"],
		] as const) {
			fireEvent.mouseMove(document, { clientX, clientY });
			expect(outlineStyle(outline).offset, `${clientX},${clientY}`).toBe(
				offset,
			);
		}
		fireEvent.mouseUp(document, { clientX: 108, clientY: 221 });
	});

	it("scrolls to where the button comes up, not to the last move", () => {
		const { container, viewport } = renderTall();
		placeBar(container);
		fireEvent.mouseDown(part(container, "scroll-thumb"), {
			button: 0,
			clientX: 108,
			clientY: 30,
		});
		fireEvent.mouseMove(document, { clientX: 108, clientY: 60 });
		// Released lower down, with no move there first.
		fireEvent.mouseUp(document, { clientX: 108, clientY: 96.5 });
		expect(viewport.scrollTop).toBe(400);
		// And released far from the bar: nothing.
		fireEvent.mouseDown(part(container, "scroll-thumb"), {
			button: 0,
			clientX: 108,
			clientY: 96.5,
		});
		fireEvent.mouseMove(document, { clientX: 108, clientY: 30 });
		fireEvent.mouseUp(document, { clientX: 300, clientY: 30 });
		expect(viewport.scrollTop).toBe(400);
	});

	it("follows the pointer again once it comes back near the bar", () => {
		const { container, viewport } = renderTall();
		placeBar(container);
		fireEvent.mouseDown(part(container, "scroll-thumb"), {
			button: 0,
			clientX: 108,
			clientY: 30,
		});
		fireEvent.mouseMove(document, { clientX: 300, clientY: 96.5 });
		fireEvent.mouseMove(document, { clientX: 110, clientY: 96.5 });
		expect(outlineStyle(part(container, "scroll-drag-outline")).offset).toBe(
			"84px",
		);
		fireEvent.mouseUp(document, { clientX: 110, clientY: 96.5 });
		expect(viewport.scrollTop).toBe(400);
	});

	it("cancels the drag when the pointer stream is lost, scrolling nothing", () => {
		const { container, viewport } = renderTall();
		placeBar(container);
		const thumb = part(container, "scroll-thumb");
		fireEvent.mouseDown(thumb, { button: 0, clientX: 108, clientY: 30 });
		fireEvent.mouseMove(document, { clientX: 108, clientY: 96.5 });
		act(() => {
			window.dispatchEvent(new Event("blur"));
		});
		expect(viewport.scrollTop).toBe(0);
		expect(thumb.classList.contains(CLASSICY_STATE.dragging)).toBe(false);
		expect(part(container, "scroll-drag-outline")).toBeUndefined();
		fireEvent.mouseUp(document, { clientX: 108, clientY: 96.5 });
		expect(viewport.scrollTop).toBe(0);
	});

	it("never snaps back when the package sets no distance", () => {
		sheet.textContent = "";
		const { container, viewport } = renderTall();
		placeBar(container);
		fireEvent.mouseDown(part(container, "scroll-thumb"), {
			button: 0,
			clientX: 108,
			clientY: 30,
		});
		fireEvent.mouseMove(document, { clientX: 900, clientY: 96.5 });
		fireEvent.mouseUp(document, { clientX: 900, clientY: 96.5 });
		expect(viewport.scrollTop).toBe(400);
	});

	it("leaves the arrows and the track as they are", () => {
		vi.useFakeTimers();
		const { container, viewport } = renderTall({ lineStep: 10 });
		fireEvent.mouseDown(part(container, "scroll-arrow-end"), { button: 0 });
		expect(viewport.scrollTop).toBe(10);
		fireEvent.mouseUp(document);
		fireEvent.mouseDown(part(container, "scroll-track"), {
			button: 0,
			clientY: 150,
		});
		expect(viewport.scrollTop).toBe(200);
		fireEvent.mouseUp(document);
	});
});

describe("ClassicyScrollArea live thumb drag (no declaration)", () => {
	it("draws no drag outline", () => {
		const { container, viewport } = renderTall();
		fireEvent.mouseDown(part(container, "scroll-thumb"), {
			button: 0,
			clientY: 30,
		});
		fireEvent.mouseMove(document, { clientY: 96.5 });
		expect(viewport.scrollTop).toBe(400);
		expect(part(container, "scroll-drag-outline")).toBeUndefined();
		fireEvent.mouseUp(document);
	});
});

describe("ClassicyScrollArea vocabulary and stylesheet", () => {
	it("declares its parts and the fits state", () => {
		expect(CLASSICY_STATE.fits).toBe("fits");
		expect(CLASSICY_PART_ATTRIBUTE.part).toBe("data-classicy-part");
		const vocabulary = JSON.parse(
			readFileSync(
				path.join(
					__dirname,
					"../../../Appearance/vocabulary/ClassicyVocabulary.json",
				),
				"utf8",
			),
		);
		const parts: string[] = vocabulary.attributes["data-classicy-part"];
		for (const name of [
			"scrollbar",
			"scroll-arrow-start",
			"scroll-track",
			"scroll-arrow-end",
			"scroll-thumb",
			"scroll-corner",
			"scroll-drag-outline",
		]) {
			expect(parts).toContain(name);
		}
	});

	it("lays the drag outline over the track like the thumb, never taking the pointer", () => {
		const base = readFileSync(
			path.join(__dirname, "ClassicyScrollArea.scss"),
			"utf8",
		);
		const rule = (selector: string) => {
			const start = base.indexOf(`${selector} {`);
			expect(start, selector).toBeGreaterThanOrEqual(0);
			return base.slice(start, base.indexOf("}", start));
		};
		expect(rule(".classicyScrollBarDragOutline")).toMatch(
			/position: absolute;[\s\S]*pointer-events: none;/,
		);
		expect(
			rule(".classicyScrollBarVertical .classicyScrollBarDragOutline"),
		).toMatch(
			/top: var\(--classicy-scroll-outline-offset\);[\s\S]*height: var\(--classicy-scroll-outline-length\);/,
		);
		expect(
			rule(".classicyScrollBarHorizontal .classicyScrollBarDragOutline"),
		).toMatch(
			/left: var\(--classicy-scroll-outline-offset\);[\s\S]*width: var\(--classicy-scroll-outline-length\);/,
		);
	});

	it("hides the browser's own bar on the viewport, in every engine", () => {
		const base = readFileSync(
			path.join(__dirname, "ClassicyScrollArea.scss"),
			"utf8",
		);
		const viewport = base.slice(
			base.indexOf(".classicyScrollAreaViewport {"),
			base.indexOf(".classicyScrollAreaViewportClipped"),
		);
		expect(viewport).toMatch(/scrollbar-width:\s*none/);
		expect(viewport).toMatch(/&::-webkit-scrollbar\s*{\s*display:\s*none/);
	});
});
