// ClassicyScrollArea draws its own bars beside a native scroll container.
// jsdom lays nothing out, so every extent the component reads is stubbed:
// the viewport's scroll and client sizes and offsets, and the bar parts'
// offsets, which follow the thumb's custom properties as a layout would.
import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render } from "@/__tests__/test-utils";
import {
	CLASSICY_PART_ATTRIBUTE,
	CLASSICY_STATE,
} from "@/Appearance/vocabulary/ClassicyVocabulary";
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

const px = (el: HTMLElement, name: string) =>
	Number.parseFloat(el.style.getPropertyValue(name)) || 0;

const has = (el: Element, cls: string) => el.classList.contains(cls);

const geometry: Record<string, (el: HTMLElement) => number> = {
	scrollWidth: (el) =>
		has(el, "classicyScrollAreaViewport") ? viewportBox.scrollWidth : 0,
	scrollHeight: (el) =>
		has(el, "classicyScrollAreaViewport") ? viewportBox.scrollHeight : 0,
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
		fireEvent.mouseEnter(track);
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
		fireEvent.mouseEnter(track);
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
		]) {
			expect(parts).toContain(name);
		}
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
