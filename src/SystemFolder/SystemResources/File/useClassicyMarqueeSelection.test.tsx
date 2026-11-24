import { act, fireEvent, render } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { readClassicyIconOpaqueMask } from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";
import {
	CLASSICY_MARQUEE_THRESHOLD,
	type ClassicyMarqueeShape,
	classicyMarqueeHits,
	classicyMarqueeRect,
	classicyMarqueeScrollDirection,
	classicyMarqueeSelection,
	classicyMarqueeStarted,
	classicyMarqueeTouches,
	measureClassicyMarqueeItems,
	resetClassicyMarqueeMaskCacheForTests,
	useClassicyMarqueeSelection,
} from "@/SystemFolder/SystemResources/File/useClassicyMarqueeSelection.internal";
import { CLASSICY_PRESS_REPEAT_INTERVAL_MS } from "@/SystemFolder/SystemResources/LittleArrows/useClassicyPressRepeat.internal";
import { CLASSICY_SCROLL_LINE_STEP } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollAreaMetrics";

// The selection rectangle as the Mac OS 8.1 Finder draws it (observed in
// Infinite Mac, story 0228-e9l): a 2 px threshold, touching selects (the
// icon's opaque pixels or its label), Shift toggles against the selection,
// and, as story 0228-e9l asks, Escape restores the selection from before the
// press.

describe("the rectangle's arithmetic", () => {
	it("starts once the pointer travels the threshold on either axis", () => {
		expect(CLASSICY_MARQUEE_THRESHOLD).toBe(2);
		expect(classicyMarqueeStarted([10, 10], [11, 11])).toBe(false);
		expect(classicyMarqueeStarted([10, 10], [12, 10])).toBe(true);
		expect(classicyMarqueeStarted([10, 10], [10, 8])).toBe(true);
		expect(classicyMarqueeStarted([10, 10], [9, 9])).toBe(false);
	});

	it("spans the press and the pointer either way round", () => {
		expect(classicyMarqueeRect([50, 40], [10, 90])).toEqual({
			left: 10,
			top: 40,
			right: 50,
			bottom: 90,
		});
	});

	const shape = (over: Partial<ClassicyMarqueeShape> = {}) =>
		({
			id: "a",
			// A 4 x 4 image whose top row is transparent.
			image: { left: 100, top: 100, width: 4, height: 4 },
			mask: Uint8Array.from([0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]),
			label: { left: 90, top: 110, width: 24, height: 10 },
			...over,
		}) satisfies ClassicyMarqueeShape;

	it("touches an icon where it meets its opaque pixels, not its transparent ones", () => {
		// Over the transparent top row only.
		expect(
			classicyMarqueeTouches(
				{ left: 100, top: 95, right: 104, bottom: 101 },
				shape(),
			),
		).toBe(false);
		// One opaque pixel.
		expect(
			classicyMarqueeTouches(
				{ left: 103, top: 101, right: 110, bottom: 102 },
				shape(),
			),
		).toBe(true);
	});

	it("touches an icon by its label alone", () => {
		expect(
			classicyMarqueeTouches(
				{ left: 80, top: 118, right: 91, bottom: 130 },
				shape(),
			),
		).toBe(true);
	});

	it("takes the image's box for its shape when its pixels cannot be read", () => {
		expect(
			classicyMarqueeTouches(
				{ left: 100, top: 95, right: 104, bottom: 101 },
				shape({ mask: null }),
			),
		).toBe(true);
	});

	it("touches nothing when it only abuts an icon (half-open edges)", () => {
		expect(
			classicyMarqueeTouches(
				{ left: 104, top: 100, right: 120, bottom: 104 },
				shape({ mask: null, label: null }),
			),
		).toBe(false);
	});

	it("lists the touched items in their order", () => {
		const rect = { left: 0, top: 0, right: 200, bottom: 200 };
		expect(
			classicyMarqueeHits(rect, [
				shape({ id: "a" }),
				shape({ id: "far", image: null, label: null }),
				shape({ id: "b" }),
			]),
		).toEqual(["a", "b"]);
	});

	it("replaces the selection, or with Shift toggles the touched items", () => {
		expect(classicyMarqueeSelection(["x"], ["a", "b"], false)).toEqual([
			"a",
			"b",
		]);
		expect(classicyMarqueeSelection(["x", "a"], ["a", "b"], true)).toEqual([
			"x",
			"b",
		]);
	});

	it("scrolls toward the pointer past an edge", () => {
		const bounds = { left: 0, top: 0, right: 100, bottom: 100 };
		expect(classicyMarqueeScrollDirection([50, 50], bounds)).toEqual([0, 0]);
		expect(classicyMarqueeScrollDirection([50, 120], bounds)).toEqual([0, 1]);
		expect(classicyMarqueeScrollDirection([-3, -3], bounds)).toEqual([-1, -1]);
		expect(classicyMarqueeScrollDirection([100, 50], bounds)).toEqual([1, 0]);
	});
});

describe("measureClassicyMarqueeItems", () => {
	afterEach(() => resetClassicyMarqueeMaskCacheForTests());

	it("reads each loaded image's mask once per size, however many items share it", () => {
		resetClassicyMarqueeMaskCacheForTests();
		const getContext = vi
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockReturnValue({
				drawImage: () => {},
				getImageData: () => ({ data: new Uint8ClampedArray(32 * 32 * 4) }),
			} as unknown as CanvasRenderingContext2D);
		const rect = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockReturnValue(DOMRect.fromRect({ x: 0, y: 0, width: 32, height: 32 }));
		try {
			const image = (src: string) => {
				const img = document.createElement("img");
				img.src = src;
				Object.defineProperty(img, "complete", { value: true });
				return img;
			};
			const items = Array.from({ length: 300 }, (_, i) => ({
				id: `item${i}`,
				image: image(i % 2 ? "/folder.png" : "/document.png"),
			}));
			measureClassicyMarqueeItems(items, { left: 0, top: 0 });
			measureClassicyMarqueeItems(items, { left: 0, top: 0 });
			// Two images, one size: two reads for 600 measured items.
			expect(getContext).toHaveBeenCalledTimes(2);
		} finally {
			getContext.mockRestore();
			rect.mockRestore();
		}
	});
});

describe("readClassicyIconOpaqueMask", () => {
	it("reads alpha above half as the shape", () => {
		const data = new Uint8ClampedArray([0, 0, 0, 127, 0, 0, 0, 128]);
		const spy = vi
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockReturnValue({
				drawImage: () => {},
				getImageData: () => ({ data }),
			} as unknown as CanvasRenderingContext2D);
		try {
			expect(
				readClassicyIconOpaqueMask(document.createElement("img"), 2, 1),
			).toEqual(Uint8Array.from([0, 1]));
		} finally {
			spy.mockRestore();
		}
	});

	it("is null with no canvas or a tainted one", () => {
		expect(
			readClassicyIconOpaqueMask(document.createElement("img"), 2, 2),
		).toBeNull();
		const spy = vi
			.spyOn(HTMLCanvasElement.prototype, "getContext")
			.mockReturnValue({
				drawImage: () => {},
				getImageData: () => {
					throw new DOMException("tainted", "SecurityError");
				},
			} as unknown as CanvasRenderingContext2D);
		try {
			expect(
				readClassicyIconOpaqueMask(document.createElement("img"), 2, 2),
			).toBeNull();
		} finally {
			spy.mockRestore();
		}
	});
});

// jsdom lays nothing out: each element's client box comes from this map.
const boxes = new Map<Element, [number, number, number, number]>();
beforeEach(() => {
	boxes.clear();
	vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
		function (this: Element) {
			const [x, y, width, height] = boxes.get(this) ?? [0, 0, 0, 0];
			return DOMRect.fromRect({ x, y, width, height });
		},
	);
});
afterEach(() => {
	vi.restoreAllMocks();
	vi.useRealTimers();
});

type HarnessProps = {
	initial?: string[];
	onSelect: (ids: string[]) => void;
	withScroller?: boolean;
};

const Harness = ({ initial = [], onSelect, withScroller }: HarnessProps) => {
	const surfaceRef = useRef<HTMLDivElement>(null);
	const scrollerRef = useRef<HTMLDivElement>(null);
	const selection = useRef(initial);
	const { start, marquee } = useClassicyMarqueeSelection({
		surfaceRef,
		getItems: () =>
			Array.from(surfaceRef.current?.querySelectorAll(".item") ?? [], (el) => ({
				id: el.id,
				image: el.querySelector("img"),
				label: el.querySelector("p"),
			})),
		getSelection: () => selection.current,
		onSelect: (ids) => {
			selection.current = ids;
			onSelect(ids);
		},
		getScroller: withScroller ? () => scrollerRef.current : undefined,
	});
	return (
		<div ref={scrollerRef} data-testid="scroller">
			{/* biome-ignore lint/a11y/noStaticElementInteractions: a test surface */}
			<div
				ref={surfaceRef}
				data-testid="surface"
				onMouseDown={(e) => {
					if (e.target === e.currentTarget) start(e);
				}}
			>
				{["a", "b", "c"].map((id) => (
					<div key={id} id={id} className="item">
						<img alt="" />
						<p>{id}</p>
					</div>
				))}
				{marquee}
			</div>
		</div>
	);
};

// The surface at (100, 100); icon images 32 px square at x 120, 220 and
// 320, y 120, labels 12 px tall under them (icon c's below the fold at y 400).
const lay = (container: HTMLElement) => {
	const el = (sel: string) => container.querySelector(sel) as Element;
	boxes.set(el('[data-testid="surface"]'), [100, 100, 400, 300]);
	boxes.set(el("#a img"), [120, 120, 32, 32]);
	boxes.set(el("#a p"), [110, 154, 52, 12]);
	boxes.set(el("#b img"), [220, 120, 32, 32]);
	boxes.set(el("#b p"), [210, 154, 52, 12]);
	boxes.set(el("#c img"), [320, 400, 32, 32]);
	boxes.set(el("#c p"), [310, 434, 52, 12]);
};

const setup = (props: Partial<HarnessProps> = {}) => {
	const onSelect = vi.fn();
	const view = render(<Harness onSelect={onSelect} {...props} />);
	lay(view.container);
	const surface = view.getByTestId("surface");
	const marquee = () =>
		view.container.querySelector<HTMLElement>(
			'[data-classicy-part="selection-marquee"]',
		);
	const press = (x: number, y: number, init: MouseEventInit = {}) =>
		fireEvent.mouseDown(surface, {
			button: 0,
			clientX: x,
			clientY: y,
			...init,
		});
	const move = (x: number, y: number) =>
		fireEvent.mouseMove(document, { clientX: x, clientY: y });
	const release = (x: number, y: number) =>
		fireEvent.mouseUp(document, { clientX: x, clientY: y });
	return { ...view, onSelect, surface, marquee, press, move, release };
};

describe("useClassicyMarqueeSelection", () => {
	it("deselects at the press and draws nothing before the threshold", () => {
		const t = setup({ initial: ["a"] });
		t.press(105, 105);
		expect(t.onSelect).toHaveBeenLastCalledWith([]);
		t.move(106, 106);
		expect(t.marquee()).toBeNull();
		t.move(107, 106);
		expect(t.marquee()).not.toBeNull();
	});

	it("draws the part in the surface's coordinates and selects what it touches as it grows and shrinks", () => {
		const t = setup();
		t.press(105, 105);
		t.move(130, 130);
		const part = t.marquee();
		expect(part?.className).toContain("classicySelectionMarquee");
		// Its clip box, at the rectangle where the surface shows all of it.
		const clip = part?.parentElement;
		expect(clip?.className).toBe("classicySelectionMarqueeClip");
		expect(clip?.getAttribute("aria-hidden")).toBe("true");
		expect(clip?.style.left).toBe("5px");
		expect(clip?.style.top).toBe("5px");
		expect(clip?.style.width).toBe("25px");
		expect(clip?.style.height).toBe("25px");
		expect(part?.style.left).toBe("0px");
		expect(part?.style.top).toBe("0px");
		expect(part?.style.width).toBe("25px");
		expect(part?.style.height).toBe("25px");
		expect(t.onSelect).toHaveBeenLastCalledWith(["a"]);
		t.move(230, 130);
		expect(t.onSelect).toHaveBeenLastCalledWith(["a", "b"]);
		// Shrinking off icon b deselects it.
		t.move(130, 130);
		expect(t.onSelect).toHaveBeenLastCalledWith(["a"]);
		t.release(130, 130);
		expect(t.marquee()).toBeNull();
		expect(t.onSelect).toHaveBeenLastCalledWith(["a"]);
	});

	it("selects an icon by its label alone", () => {
		const t = setup();
		t.press(105, 170);
		t.move(112, 160);
		expect(t.onSelect).toHaveBeenLastCalledWith(["a"]);
	});

	it("keeps the selection with Shift and toggles what it touches", () => {
		const t = setup({ initial: ["a", "c"] });
		t.press(105, 105, { shiftKey: true });
		expect(t.onSelect).not.toHaveBeenCalled();
		t.move(230, 130);
		expect(t.onSelect).toHaveBeenLastCalledWith(["c", "b"]);
		t.move(110, 110);
		expect(t.onSelect).toHaveBeenLastCalledWith(["a", "c"]);
	});

	it.each([
		"metaKey",
		"ctrlKey",
		"altKey",
	])("treats a press with %s as a plain one", (key) => {
		const t = setup({ initial: ["c"] });
		t.press(105, 105, { [key]: true });
		expect(t.onSelect).toHaveBeenLastCalledWith([]);
		t.move(130, 130);
		expect(t.onSelect).toHaveBeenLastCalledWith(["a"]);
	});

	it("cancels on Escape, restoring the selection from before the press", () => {
		const t = setup({ initial: ["c"] });
		t.press(105, 105);
		t.move(230, 130);
		expect(t.onSelect).toHaveBeenLastCalledWith(["a", "b"]);
		const escapeKey = new KeyboardEvent("keydown", {
			key: "Escape",
			bubbles: true,
			cancelable: true,
		});
		const heard = vi.fn();
		document.body.addEventListener("keydown", heard);
		act(() => {
			document.body.dispatchEvent(escapeKey);
		});
		document.body.removeEventListener("keydown", heard);
		expect(escapeKey.defaultPrevented).toBe(true);
		expect(heard).not.toHaveBeenCalled();
		expect(t.marquee()).toBeNull();
		expect(t.onSelect).toHaveBeenLastCalledWith(["c"]);
		// Over: the pointer no longer moves it.
		const calls = t.onSelect.mock.calls.length;
		t.move(330, 450);
		expect(t.onSelect).toHaveBeenCalledTimes(calls);
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends where it is on a %s, keeping the selection", (loss) => {
		const t = setup();
		t.press(105, 105);
		t.move(130, 130);
		losePointerStream(loss);
		expect(t.marquee()).toBeNull();
		expect(t.onSelect).toHaveBeenLastCalledWith(["a"]);
		t.move(230, 130);
		expect(t.onSelect).toHaveBeenLastCalledWith(["a"]);
	});

	it("watches the pointer stream only from the press to its end", () => {
		const live = trackPointerStreamListeners();
		const t = setup();
		const before = live.size;
		t.press(105, 105);
		expect(live.size).toBe(before + 3);
		t.release(105, 105);
		expect(live.size).toBe(before);
		t.press(105, 105);
		t.unmount();
		expect(live.size).toBe(before);
	});

	it("clips the rectangle at the surface's edge, never framing the cut", () => {
		const t = setup();
		t.press(450, 350);
		t.move(600, 500);
		const part = t.marquee();
		// The part keeps the whole rectangle, so its frame runs out past the
		// edge; the clip box cuts it there, as QuickDraw clipped the frame.
		expect(part?.style.width).toBe("150px");
		expect(part?.style.height).toBe("150px");
		expect(part?.style.left).toBe("0px");
		expect(part?.style.top).toBe("0px");
		const clip = part?.parentElement;
		expect(clip?.style.left).toBe("350px");
		expect(clip?.style.top).toBe("250px");
		expect(clip?.style.width).toBe("50px");
		expect(clip?.style.height).toBe("50px");
	});

	it("draws nothing for an empty rectangle (a move along one axis only)", () => {
		const t = setup();
		t.press(105, 105);
		t.move(140, 105);
		expect(t.marquee()).toBeNull();
		t.move(140, 108);
		expect(t.marquee()).not.toBeNull();
	});

	it("publishes the desktop's corner from the rectangle's, for the checker's phase", () => {
		const onSelect = vi.fn();
		const view = render(
			<div className="classicyDesktop" data-testid="desktop">
				<Harness onSelect={onSelect} />
			</div>,
		);
		lay(view.container);
		boxes.set(view.getByTestId("desktop"), [10, 20, 1000, 700]);
		fireEvent.mouseDown(view.getByTestId("surface"), {
			button: 0,
			clientX: 105,
			clientY: 106,
		});
		fireEvent.mouseMove(document, { clientX: 130, clientY: 130 });
		const part = view.container.querySelector<HTMLElement>(
			'[data-classicy-part="selection-marquee"]',
		);
		// The rectangle's corner is at (105, 106) on the screen, the
		// desktop's at (10, 20).
		expect(part?.style.getPropertyValue("--classicy-pattern-origin-x")).toBe(
			"-95px",
		);
		expect(part?.style.getPropertyValue("--classicy-pattern-origin-y")).toBe(
			"-86px",
		);
	});

	it("holds off every key but Escape and the modifiers while it lasts", () => {
		const t = setup({ initial: ["c"] });
		const heard = vi.fn();
		document.body.addEventListener("keydown", heard);
		t.press(105, 105);
		t.move(130, 130);
		for (const key of ["ArrowDown", "a", "Delete", "Enter"]) {
			const e = new KeyboardEvent("keydown", {
				key,
				bubbles: true,
				cancelable: true,
			});
			act(() => {
				document.body.dispatchEvent(e);
			});
			expect(e.defaultPrevented, key).toBe(true);
		}
		fireEvent.keyDown(document.body, { key: "Shift" });
		expect(heard.mock.calls.map(([e]) => e.key)).toEqual(["Shift"]);
		t.release(130, 130);
		// Over: keys reach the page again.
		fireEvent.keyDown(document.body, { key: "ArrowDown" });
		expect(heard).toHaveBeenCalledTimes(2);
		document.body.removeEventListener("keydown", heard);
	});

	it("keeps to the selection as it is, if something else changes it mid-gesture", () => {
		let current: string[] = [];
		const onSelect = vi.fn((ids: string[]) => {
			current = ids;
		});
		const surfaceRef = { current: null as HTMLDivElement | null };
		const Probe = () => {
			const { start, marquee } = useClassicyMarqueeSelection({
				surfaceRef,
				getItems: () =>
					Array.from(
						surfaceRef.current?.querySelectorAll(".item") ?? [],
						(el) => ({
							id: el.id,
							image: el.querySelector("img"),
							label: el.querySelector("p"),
						}),
					),
				getSelection: () => current,
				onSelect,
			});
			return (
				// biome-ignore lint/a11y/noStaticElementInteractions: a test surface
				<div
					ref={(el) => {
						surfaceRef.current = el;
					}}
					data-testid="surface"
					onMouseDown={(e) => start(e)}
				>
					{["a", "b", "c"].map((id) => (
						<div key={id} id={id} className="item">
							<img alt="" />
							<p>{id}</p>
						</div>
					))}
					{marquee}
				</div>
			);
		};
		const view = render(<Probe />);
		lay(view.container);
		fireEvent.mouseDown(view.getByTestId("surface"), {
			button: 0,
			clientX: 105,
			clientY: 105,
		});
		fireEvent.mouseMove(document, { clientX: 130, clientY: 130 });
		expect(current).toEqual(["a"]);
		// Something else (code, not a key: keys are held off) selects c.
		current = ["c"];
		fireEvent.mouseMove(document, { clientX: 131, clientY: 131 });
		// The rectangle's own selection again, not left to the stale one.
		expect(current).toEqual(["a"]);
	});

	describe("past the scroller's edge", () => {
		const scrolled = () => {
			vi.useFakeTimers();
			const t = setup({ withScroller: true });
			const scroller = t.getByTestId("scroller");
			// The window shows y 100 to 300 of the screen; scrolling moves the
			// surface and its icons up.
			boxes.set(scroller, [100, 100, 400, 200]);
			let top = 0;
			Object.defineProperty(scroller, "scrollTop", {
				get: () => top,
				set: (value: number) => {
					const delta = value - top;
					top = value;
					for (const [el, [x, y, w, h]] of boxes)
						if (el !== scroller) boxes.set(el, [x, y - delta, w, h]);
				},
			});
			return { ...t, scrollTop: () => top };
		};

		it("scrolls a line at once and every repeat, the press point scrolling with the contents", () => {
			const t = scrolled();
			t.press(105, 105);
			t.move(200, 200);
			expect(t.scrollTop()).toBe(0);
			t.move(330, 320);
			expect(t.scrollTop()).toBe(CLASSICY_SCROLL_LINE_STEP);
			act(() => {
				vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS * 9);
			});
			expect(t.scrollTop()).toBe(CLASSICY_SCROLL_LINE_STEP * 10);
			// Icon c scrolled up under the pointer and is selected; the press
			// point went up with the contents, so the rectangle still holds a.
			expect(t.onSelect).toHaveBeenLastCalledWith(["a", "b", "c"]);
			// Clipped to where the window shows; the part keeps the whole
			// rectangle, its top (the press point) scrolled away above.
			const part = t.marquee();
			const clip = part?.parentElement;
			expect(clip?.style.top).toBe(`${CLASSICY_SCROLL_LINE_STEP * 10}px`);
			expect(clip?.style.height).toBe("200px");
			expect(part?.style.top).toBe(`${5 - CLASSICY_SCROLL_LINE_STEP * 10}px`);
			expect(part?.style.height).toBe(
				`${320 + CLASSICY_SCROLL_LINE_STEP * 10 - 100 - 5}px`,
			);
		});

		it("stops when the pointer comes back inside", () => {
			const t = scrolled();
			t.press(105, 105);
			t.move(330, 320);
			t.move(330, 250);
			const at = t.scrollTop();
			act(() => {
				vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS * 5);
			});
			expect(t.scrollTop()).toBe(at);
		});

		it("stops when the rectangle ends", () => {
			const t = scrolled();
			t.press(105, 105);
			t.move(330, 320);
			t.release(330, 320);
			const at = t.scrollTop();
			act(() => {
				vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS * 5);
			});
			expect(t.scrollTop()).toBe(at);
		});
	});
});
