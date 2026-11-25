import { afterEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import {
	CLASSICY_DROP_DESKTOP_ATTRIBUTE,
	CLASSICY_DROP_FOLDER_ATTRIBUTE,
	CLASSICY_FILE_DRAG_THRESHOLD,
	findClassicyFileDragAutoScroll,
	findClassicyFileDropTarget,
	startClassicyFileDrag,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import { traceClassicyDragOutline } from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";
import { CLASSICY_PRESS_REPEAT_INTERVAL_MS } from "@/SystemFolder/SystemResources/LittleArrows/useClassicyPressRepeat.internal";
import {
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import { registerClassicyScrollViewport } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";

/** Render a mask as rows of "#"/"." for readable assertions. */
const draw = (mask: Uint8Array, width: number) =>
	Array.from({ length: mask.length / width }, (_, y) =>
		Array.from(mask.slice(y * width, (y + 1) * width), (v) =>
			v ? "#" : ".",
		).join(""),
	);

const maskFrom = (rows: string[]) =>
	Uint8Array.from(rows.join("").split(""), (c) => (c === "#" ? 1 : 0));

describe("traceClassicyDragOutline", () => {
	it("dots the edge of a filled shape and leaves its inside empty", () => {
		const rows = ["######", "######", "######", "######"];
		const out = draw(traceClassicyDragOutline(maskFrom(rows), 6, 4), 6);
		// Nothing inside the shape is drawn…
		expect(out[1].slice(1, 5)).toBe("....");
		expect(out[2].slice(1, 5)).toBe("....");
		// …and the edge alternates dot / gap.
		expect(out[0]).toBe("#.#.#.");
	});

	it("dots a 45° edge too, instead of drawing it solid or not at all", () => {
		// A staircase like the folder tab's slanted corner.
		const rows = ["#.....", "##....", "###...", "####..", "#####.", "######"];
		const outline = traceClassicyDragOutline(maskFrom(rows), 6, 6);
		const diagonal = [0, 1, 2, 3, 4, 5].map((i) => outline[i * 6 + i]);
		expect(diagonal).toContain(1);
		expect(diagonal).toContain(0);
	});

	it("draws nothing for an empty mask", () => {
		expect(
			Array.from(traceClassicyDragOutline(new Uint8Array(9), 3, 3)),
		).toEqual(new Array(9).fill(0));
	});
});

describe("findClassicyFileDropTarget", () => {
	const build = () => {
		document.body.innerHTML = `
			<div id="desk" ${CLASSICY_DROP_DESKTOP_ATTRIBUTE}>
				<div id="icon" class="classicyDesktopIcon" ${CLASSICY_DROP_FOLDER_ATTRIBUTE}="Macintosh HD:Desktop Folder:Stuff"><img id="iconImg"></div>
				<div id="finder" class="classicyWindow">
					<div id="title"></div>
					<div id="browser" ${CLASSICY_DROP_FOLDER_ATTRIBUTE}="Macintosh HD:Documents">
						<div id="row"></div>
					</div>
				</div>
				<div id="other" class="classicyWindow"><p id="text"></p></div>
				<div id="bare"></div>
			</div>`;
		return (id: string) => document.getElementById(id) as Element;
	};
	const at =
		(...elements: Element[]) =>
		() =>
			elements;

	it("resolves a Finder window's contents to its folder", () => {
		const el = build();
		expect(
			findClassicyFileDropTarget(0, 0, { elementsFromPoint: at(el("row")) }),
		).toEqual({
			destination: { kind: "folder", path: "Macintosh HD:Documents" },
			element: el("browser"),
		});
	});

	it("resolves a folder icon to that folder", () => {
		const el = build();
		expect(
			findClassicyFileDropTarget(0, 0, { elementsFromPoint: at(el("iconImg")) })
				?.destination,
		).toEqual({ kind: "folder", path: "Macintosh HD:Desktop Folder:Stuff" });
	});

	it("resolves bare desktop to the desktop", () => {
		const el = build();
		expect(
			findClassicyFileDropTarget(0, 0, { elementsFromPoint: at(el("bare")) })
				?.destination,
		).toEqual({ kind: "desktop" });
	});

	it("refuses other windows and window chrome, even over the desktop", () => {
		const el = build();
		for (const id of ["text", "title"]) {
			expect(
				findClassicyFileDropTarget(0, 0, { elementsFromPoint: at(el(id)) }),
			).toBeNull();
		}
	});

	it("skips the dragged element and judges what is beneath it", () => {
		const el = build();
		expect(
			findClassicyFileDropTarget(0, 0, {
				exclude: el("icon"),
				elementsFromPoint: at(el("iconImg"), el("row")),
			})?.destination,
		).toEqual({ kind: "folder", path: "Macintosh HD:Documents" });
	});

	it("only considers the topmost element", () => {
		const el = build();
		expect(
			findClassicyFileDropTarget(0, 0, {
				elementsFromPoint: at(el("text"), el("row")),
			}),
		).toBeNull();
	});
});

describe("startClassicyFileDrag", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		document.body.className = "";
	});

	const fire = (type: string, x: number, y: number) =>
		document.dispatchEvent(
			new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }),
		);

	const setup = () => {
		document.body.innerHTML = `<div id="browser" ${CLASSICY_DROP_FOLDER_ATTRIBUTE}="Macintosh HD:Archive"></div>`;
		const browser = document.getElementById("browser") as Element;
		const onDrop = vi.fn();
		const onClick = vi.fn();
		startClassicyFileDrag({
			start: { clientX: 10, clientY: 10 },
			parts: [],
			onDrop,
			onClick,
			elementsFromPoint: () => [browser],
		});
		return { browser, onDrop, onClick };
	};

	it("treats a press that barely moves as a click", () => {
		const { onDrop, onClick } = setup();
		fire("mousemove", 12, 11);
		fire("mouseup", 12, 11);
		expect(onClick).toHaveBeenCalledOnce();
		expect(onDrop).not.toHaveBeenCalled();
	});

	it("shows the outline layer past the threshold, highlights the folder, and drops on it", () => {
		const { browser, onDrop } = setup();
		fire("mousemove", 40, 30);
		expect(document.querySelector(".classicyFileDragGhost")).not.toBeNull();
		expect(browser).toHaveClass("classicyFileDropTarget");
		expect(document.body).toHaveClass("classicyFileDragging");

		fire("mouseup", 40, 30);
		expect(onDrop).toHaveBeenCalledWith(
			{
				destination: { kind: "folder", path: "Macintosh HD:Archive" },
				element: browser,
			},
			[40, 30],
			// No outline could be measured in jsdom, so no grab offset.
			[40, 30],
		);
		// Everything is cleaned up.
		expect(document.querySelector(".classicyFileDragGhost")).toBeNull();
		expect(browser).not.toHaveClass("classicyFileDropTarget");
		expect(document.body).not.toHaveClass("classicyFileDragging");
	});

	it("cancels on Escape without dropping", () => {
		const { onDrop } = setup();
		fire("mousemove", 40, 30);
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		fire("mouseup", 40, 30);
		expect(onDrop).not.toHaveBeenCalled();
		expect(document.querySelector(".classicyFileDragGhost")).toBeNull();
	});
});

describe("startClassicyFileDrag start and end callbacks", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		document.body.className = "";
	});

	const fire = (type: string, x: number, y: number) =>
		document.dispatchEvent(
			new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }),
		);
	const pressEscape = () =>
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);

	/** A drag from (10, 10); `overTarget` decides what the pointer is over. */
	const setup = (overTarget = true) => {
		document.body.innerHTML = `<div id="browser" ${CLASSICY_DROP_FOLDER_ATTRIBUTE}="Macintosh HD:Archive"></div>`;
		const browser = document.getElementById("browser") as Element;
		const calls: string[] = [];
		// Whether the outline was on screen while each callback ran.
		const ghostAt: Record<string, boolean> = {};
		const ghostUp = () =>
			document.querySelector(".classicyFileDragGhost") !== null;
		const onStart = vi.fn(() => {
			ghostAt.start = ghostUp();
			calls.push("start");
		});
		const onEnd = vi.fn(() => {
			ghostAt.end = ghostUp();
			calls.push("end");
		});
		const onDrop = vi.fn(() => calls.push("drop"));
		const onClick = vi.fn();
		const abandon = startClassicyFileDrag({
			start: { clientX: 10, clientY: 10 },
			parts: [],
			onDrop,
			onClick,
			onStart,
			onEnd,
			elementsFromPoint: () => (overTarget ? [browser] : []),
		});
		return { onStart, onEnd, onDrop, onClick, abandon, calls, ghostAt };
	};

	it("reports nothing for a press that never crosses the threshold", () => {
		const { onStart, onEnd, onClick } = setup();
		fire("mousemove", 10 + CLASSICY_FILE_DRAG_THRESHOLD - 1, 11);
		fire("mouseup", 10 + CLASSICY_FILE_DRAG_THRESHOLD - 1, 11);
		expect(onClick).toHaveBeenCalledOnce();
		expect(onStart).not.toHaveBeenCalled();
		expect(onEnd).not.toHaveBeenCalled();
	});

	it("starts once at the threshold, however far the pointer goes", () => {
		const { onStart, onEnd } = setup();
		fire("mousemove", 10 + CLASSICY_FILE_DRAG_THRESHOLD - 1, 10);
		expect(onStart).not.toHaveBeenCalled();
		fire("mousemove", 10 + CLASSICY_FILE_DRAG_THRESHOLD, 10);
		expect(onStart).toHaveBeenCalledOnce();
		// The outline is up when the start is reported.
		expect(document.querySelector(".classicyFileDragGhost")).not.toBeNull();
		fire("mousemove", 60, 40);
		fire("mousemove", 80, 50);
		expect(onStart).toHaveBeenCalledOnce();
		expect(onEnd).not.toHaveBeenCalled();
	});

	it("ends once on a drop, before the drop is handed over", () => {
		const { onStart, onEnd, onDrop, calls, ghostAt } = setup();
		fire("mousemove", 40, 30);
		fire("mouseup", 40, 30);
		// The outline is up while onStart runs and gone while onEnd runs.
		expect(ghostAt).toEqual({ start: true, end: false });
		// A stray second release ends nothing.
		fire("mouseup", 40, 30);
		expect(onStart).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledWith({
			dropped: true,
			canceled: false,
			lost: false,
		});
		expect(onDrop).toHaveBeenCalledOnce();
		expect(calls).toEqual(["start", "end", "drop"]);
		// The outline is gone by the time the end is reported.
		expect(document.querySelector(".classicyFileDragGhost")).toBeNull();
	});

	it("ends once, not dropped, on a release over nothing", () => {
		const { onStart, onEnd, onDrop } = setup(false);
		fire("mousemove", 40, 30);
		fire("mouseup", 40, 30);
		fire("mouseup", 40, 30);
		expect(onStart).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledWith({
			dropped: false,
			canceled: false,
			lost: false,
		});
		expect(onDrop).toHaveBeenCalledWith(null, [40, 30], [40, 30]);
	});

	it("ends once, canceled, on Escape, and the release after it ends nothing", () => {
		const { onStart, onEnd, onDrop, ghostAt } = setup();
		fire("mousemove", 40, 30);
		pressEscape();
		pressEscape();
		expect(ghostAt).toEqual({ start: true, end: false });
		fire("mouseup", 40, 30);
		expect(onStart).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledWith({
			dropped: false,
			canceled: true,
			lost: false,
		});
		expect(onDrop).not.toHaveBeenCalled();
	});

	it("ignores Escape before the drag starts", () => {
		const { onStart, onEnd, onClick } = setup();
		pressEscape();
		fire("mouseup", 11, 11);
		expect(onStart).not.toHaveBeenCalled();
		expect(onEnd).not.toHaveBeenCalled();
		expect(onClick).toHaveBeenCalledOnce();
	});

	it("ends once, canceled, when a started drag is abandoned", () => {
		const { onStart, onEnd, onDrop, abandon, ghostAt } = setup();
		fire("mousemove", 40, 30);
		abandon();
		expect(ghostAt).toEqual({ start: true, end: false });
		abandon();
		fire("mouseup", 40, 30);
		expect(onStart).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledWith({
			dropped: false,
			canceled: true,
			lost: false,
		});
		expect(onDrop).not.toHaveBeenCalled();
		expect(document.querySelector(".classicyFileDragGhost")).toBeNull();
	});

	it("reports nothing when a press is abandoned before it drags", () => {
		const { onStart, onEnd, onClick, abandon } = setup();
		abandon();
		fire("mousemove", 40, 30);
		fire("mouseup", 40, 30);
		expect(onStart).not.toHaveBeenCalled();
		expect(onEnd).not.toHaveBeenCalled();
		expect(onClick).not.toHaveBeenCalled();
	});

	it("still drops when the caller's onEnd throws, and logs the error", () => {
		document.body.innerHTML = `<div id="browser" ${CLASSICY_DROP_FOLDER_ATTRIBUTE}="Macintosh HD:Archive"></div>`;
		const browser = document.getElementById("browser") as Element;
		const errors: unknown[] = [];
		registerClassicyLogSink({
			id: "file-drag-test",
			onError: (entry) => errors.push([entry.subsystem, entry.message]),
		});
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		try {
			const onDrop = vi.fn();
			startClassicyFileDrag({
				start: { clientX: 10, clientY: 10 },
				parts: [],
				onDrop,
				onEnd: () => {
					throw new Error("boom");
				},
				elementsFromPoint: () => [browser],
			});
			fire("mousemove", 40, 30);
			fire("mouseup", 40, 30);
			expect(onDrop).toHaveBeenCalledOnce();
			expect(errors).toEqual([["ClassicyFileDrag", "onEnd threw; ignored."]]);
		} finally {
			unregisterClassicyLogSink("file-drag-test");
			consoleError.mockRestore();
		}
	});
});

describe("startClassicyFileDrag when the pointer stream is lost", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		document.body.className = "";
		vi.restoreAllMocks();
	});

	const fire = (type: string, x: number, y: number) =>
		document.dispatchEvent(
			new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }),
		);

	const setup = () => {
		document.body.innerHTML = `<div id="browser" ${CLASSICY_DROP_FOLDER_ATTRIBUTE}="Macintosh HD:Archive"></div>`;
		const browser = document.getElementById("browser") as Element;
		const onDrop = vi.fn();
		const onClick = vi.fn();
		const onStart = vi.fn();
		const onEnd = vi.fn();
		startClassicyFileDrag({
			start: { clientX: 10, clientY: 10 },
			parts: [],
			onDrop,
			onClick,
			onStart,
			onEnd,
			elementsFromPoint: () => [browser],
		});
		return { browser, onDrop, onClick, onStart, onEnd };
	};

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends a drag in progress as canceled, as Escape does, on a %s", (loss) => {
		const { browser, onDrop, onEnd } = setup();
		fire("mousemove", 40, 30);
		expect(browser).toHaveClass("classicyFileDropTarget");
		losePointerStream(loss);
		expect(onEnd).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledWith({
			dropped: false,
			canceled: true,
			lost: true,
		});
		// The outline, the highlight and the body class are gone.
		expect(document.querySelector(".classicyFileDragGhost")).toBeNull();
		expect(browser).not.toHaveClass("classicyFileDropTarget");
		expect(document.body).not.toHaveClass("classicyFileDragging");
		// The pointer coming back ends nothing more and drops nothing.
		fire("mousemove", 60, 40);
		fire("mouseup", 60, 40);
		losePointerStream(loss);
		expect(onEnd).toHaveBeenCalledOnce();
		expect(onDrop).not.toHaveBeenCalled();
		expect(document.querySelector(".classicyFileDragGhost")).toBeNull();
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("abandons a press that has not dragged yet on a %s, reporting nothing", (loss) => {
		const { onDrop, onClick, onStart, onEnd } = setup();
		losePointerStream(loss);
		fire("mousemove", 40, 30);
		fire("mouseup", 40, 30);
		expect(onStart).not.toHaveBeenCalled();
		expect(onEnd).not.toHaveBeenCalled();
		expect(onClick).not.toHaveBeenCalled();
		expect(onDrop).not.toHaveBeenCalled();
		expect(document.querySelector(".classicyFileDragGhost")).toBeNull();
	});

	it("stops watching the pointer stream however the drag ends", () => {
		const live = trackPointerStreamListeners();
		const { onEnd } = setup();
		expect(live.size).toBe(3);
		fire("mousemove", 40, 30);
		fire("mouseup", 40, 30);
		expect(live.size).toBe(0);
		// A loss after the release is not a second end.
		losePointerStream("blur");
		expect(onEnd).toHaveBeenCalledOnce();

		setup();
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		// Escape before the threshold is ignored: still watching.
		expect(live.size).toBe(3);
		fire("mousemove", 40, 30);
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		expect(live.size).toBe(0);

		setup();
		losePointerStream("hidden");
		expect(live.size).toBe(0);
	});
});

// Automatic scrolling (WIG Ch.5 p.72, Ch.6 "Automatic Scrolling" p.91;
// HIG7 p.274): a scroll area holding drop targets scrolls a line at a time
// while a file drag's pointer rests within a line step of its edge.
describe("startClassicyFileDrag automatic scrolling", () => {
	let unregister: (() => void) | null = null;
	afterEach(() => {
		unregister?.();
		unregister = null;
		document.body.innerHTML = "";
		document.body.className = "";
		vi.useRealTimers();
	});

	const fire = (type: string, x: number, y: number) =>
		document.dispatchEvent(
			new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }),
		);

	/**
	 * A registered viewport 300 x 200 at the origin over `content` px of
	 * content each way, holding a folder (a drop target) unless `dropTarget`
	 * is false.
	 */
	const viewportOf = ({
		content = [300, 1000],
		dropTarget = true,
		lineStep = 16,
	}: {
		content?: [number, number];
		dropTarget?: boolean;
		lineStep?: number;
	} = {}) => {
		document.body.innerHTML = `<div id="viewport"><div id="row" ${
			dropTarget
				? `${CLASSICY_DROP_FOLDER_ATTRIBUTE}="Macintosh HD:Archive"`
				: ""
		}></div></div>`;
		const viewport = document.getElementById("viewport") as HTMLElement;
		const row = document.getElementById("row") as HTMLElement;
		const position = { left: 0, top: 0 };
		const extents = {
			scrollWidth: content[0],
			scrollHeight: content[1],
			clientWidth: 300,
			clientHeight: 200,
		};
		for (const [key, value] of Object.entries(extents)) {
			Object.defineProperty(viewport, key, { value, configurable: true });
		}
		for (const [key, axis] of [
			["scrollLeft", "left"],
			["scrollTop", "top"],
		] as const) {
			Object.defineProperty(viewport, key, {
				configurable: true,
				get: () => position[axis],
				set: (value: number) => {
					const max =
						axis === "left"
							? extents.scrollWidth - extents.clientWidth
							: extents.scrollHeight - extents.clientHeight;
					position[axis] = Math.min(Math.max(value, 0), max);
				},
			});
		}
		vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(
			DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 200 }),
		);
		const scrollBy = vi.fn((dx: number, dy: number) => {
			viewport.scrollLeft += dx;
			viewport.scrollTop += dy;
		});
		unregister = registerClassicyScrollViewport(viewport, {
			lineStep: () => lineStep,
			scrollBy,
		});
		return { viewport, row, scrollBy, position };
	};

	it("finds the edge band a line step wide, toward an end the viewport can still reach", () => {
		const { row, position } = viewportOf({ content: [600, 1000] });
		const at = (x: number, y: number) =>
			findClassicyFileDragAutoScroll(x, y, { elementsFromPoint: () => [row] });
		// The middle, and the top and left edges at the start: nothing.
		expect(at(150, 100)).toBeNull();
		expect(at(150, 0)).toBeNull();
		expect(at(5, 100)).toBeNull();
		// The bottom band (184 to 199) and the right band (284 to 299).
		expect(at(150, 183)).toBeNull();
		expect(at(150, 184)).toMatchObject({ dx: 0, dy: 16 });
		expect(at(150, 199)).toMatchObject({ dx: 0, dy: 16 });
		expect(at(299, 100)).toMatchObject({ dx: 16, dy: 0 });
		expect(at(299, 199)).toMatchObject({ dx: 16, dy: 16 });
		// Past the right and bottom edges: outside the viewport.
		expect(at(150, 200)).toBeNull();
		expect(at(300, 100)).toBeNull();
		// Scrolled to the middle, the top and left bands scroll back.
		position.top = 400;
		position.left = 150;
		expect(at(0, 15)).toMatchObject({ dx: -16, dy: -16 });
		expect(at(150, 16)).toBeNull();
		// Within a pixel of the end counts as the end (a zoomed page).
		position.top = 799.5;
		expect(at(150, 190)).toBeNull();
	});

	it("leaves an area that holds no drop target, and one under something else", () => {
		const { row } = viewportOf({ dropTarget: false });
		expect(
			findClassicyFileDragAutoScroll(150, 190, {
				elementsFromPoint: () => [row],
			}),
		).toBeNull();
		const { row: target } = viewportOf();
		const over = document.createElement("div");
		document.body.append(over);
		// Only the topmost element counts: a window over the area hides it.
		expect(
			findClassicyFileDragAutoScroll(150, 190, {
				elementsFromPoint: () => [over, target],
			}),
		).toBeNull();
		// The dragged item itself is looked through.
		expect(
			findClassicyFileDragAutoScroll(150, 190, {
				exclude: over,
				elementsFromPoint: () => [over, target],
			}),
		).toMatchObject({ dy: 16 });
	});

	it("scrolls a line per repeat interval while the pointer rests in the band, stopping at the end", () => {
		vi.useFakeTimers();
		const { row, scrollBy, position } = viewportOf({ content: [300, 248] });
		startClassicyFileDrag({
			start: { clientX: 150, clientY: 100 },
			parts: [],
			onDrop: vi.fn(),
			elementsFromPoint: () => [row],
		});
		fire("mousemove", 150, 190);
		// Not at once: crossing the band on the way elsewhere scrolls nothing.
		vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS - 1);
		expect(scrollBy).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(scrollBy).toHaveBeenLastCalledWith(0, 16);
		expect(position.top).toBe(16);
		vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS * 10);
		// 48 px of travel: three lines, then the end.
		expect(scrollBy).toHaveBeenCalledTimes(3);
		expect(position.top).toBe(48);
		// Back up into the top band, which can scroll now.
		fire("mousemove", 150, 5);
		vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS);
		expect(scrollBy).toHaveBeenLastCalledWith(0, -16);
		// The middle: it stops.
		fire("mousemove", 150, 100);
		vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS * 5);
		expect(scrollBy).toHaveBeenCalledTimes(4);
		fire("mouseup", 150, 100);
	});

	it("finds the drop target again as the content moves under a still pointer", () => {
		vi.useFakeTimers();
		const { row } = viewportOf();
		const folder = document.createElement("div");
		folder.setAttribute(CLASSICY_DROP_FOLDER_ATTRIBUTE, "Macintosh HD:Plans");
		row.append(folder);
		let hits: Element[] = [row];
		startClassicyFileDrag({
			start: { clientX: 150, clientY: 100 },
			parts: [],
			onDrop: vi.fn(),
			elementsFromPoint: () => hits,
		});
		fire("mousemove", 150, 190);
		expect(row).toHaveClass("classicyFileDropTarget");
		// The scroll brings a folder under the pointer.
		hits = [folder];
		vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS);
		expect(folder).toHaveClass("classicyFileDropTarget");
		expect(row).not.toHaveClass("classicyFileDropTarget");
		fire("mouseup", 150, 190);
	});

	it("stops when the drag ends: released, canceled or lost", () => {
		vi.useFakeTimers();
		for (const end of [
			() => fire("mouseup", 150, 190),
			() =>
				document.dispatchEvent(
					new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
				),
			() => window.dispatchEvent(new Event("blur")),
		]) {
			const { row, scrollBy } = viewportOf();
			startClassicyFileDrag({
				start: { clientX: 150, clientY: 100 },
				parts: [],
				onDrop: vi.fn(),
				elementsFromPoint: () => [row],
			});
			fire("mousemove", 150, 190);
			end();
			vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS * 5);
			expect(scrollBy).not.toHaveBeenCalled();
			unregister?.();
		}
	});

	it("scrolls nothing before the press becomes a drag", () => {
		vi.useFakeTimers();
		const { row, scrollBy } = viewportOf();
		startClassicyFileDrag({
			start: { clientX: 150, clientY: 190 },
			parts: [],
			onDrop: vi.fn(),
			onClick: vi.fn(),
			elementsFromPoint: () => [row],
		});
		// In the band, but under the drag threshold.
		fire("mousemove", 151, 191);
		vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS * 5);
		expect(scrollBy).not.toHaveBeenCalled();
		fire("mouseup", 151, 191);
	});
});
