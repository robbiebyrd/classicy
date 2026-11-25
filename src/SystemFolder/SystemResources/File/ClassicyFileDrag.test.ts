import { afterEach, describe, expect, it, vi } from "vitest";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
	trackPointerStreamListeners,
} from "@/__tests__/losePointerStream";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
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
			// Without the package's copy modifier every drop moves.
			"move",
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
		expect(onDrop).toHaveBeenCalledWith(null, [40, 30], [40, 30], "move");
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

// The drop feedback on the desktop root (the remaining chapters' audit's
// 4.6 / 5.32: WIG Ch.4 Table 4.1, Ch.13 p.316, Ch.5 p.62 and Figure 5.17):
// `data-classicy-drop="none"` while nothing under the pointer takes the
// drop, under every package (only a package's stylesheet reads it).
describe("startClassicyFileDrag's drop feedback", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		document.body.className = "";
	});

	const fire = (type: string, x: number, y: number) =>
		document.dispatchEvent(
			new MouseEvent(type, { clientX: x, clientY: y, bubbles: true }),
		);

	// A desktop holding a folder; `hits` is what lies under the pointer.
	const setup = (
		options: Partial<Parameters<typeof startClassicyFileDrag>[0]> = {},
	) => {
		document.body.innerHTML = `<div id="classicyDesktop" class="classicyDesktop" ${CLASSICY_DROP_DESKTOP_ATTRIBUTE}><div id="icon"></div><div id="folder" ${CLASSICY_DROP_FOLDER_ATTRIBUTE}="HD:Archive"></div><div class="classicyWindow" id="window"></div></div>`;
		const desktop = document.getElementById("classicyDesktop") as Element;
		const folder = document.getElementById("folder") as Element;
		const windowEl = document.getElementById("window") as Element;
		let hits: Element[] = [];
		const onDrop = vi.fn();
		const abandon = startClassicyFileDrag({
			start: { clientX: 10, clientY: 10 },
			parts: [],
			source: document.getElementById("icon"),
			onDrop,
			elementsFromPoint: () => hits,
			...options,
		});
		return {
			desktop,
			folder,
			windowEl,
			onDrop,
			abandon,
			over: (el: Element | null) => {
				hits = el ? [el] : [];
			},
		};
	};
	const drop = (desktop: Element) => desktop.getAttribute("data-classicy-drop");

	it("reads none over nothing that takes the drop, and the drop's effect over a target", () => {
		const { desktop, folder, windowEl, over } = setup();
		over(windowEl);
		// Before the threshold: no drag, no feedback.
		fire("mousemove", 11, 11);
		expect(drop(desktop)).toBeNull();
		fire("mousemove", 40, 40);
		expect(drop(desktop)).toBe("none");
		over(folder);
		fire("mousemove", 50, 40);
		expect(drop(desktop)).toBe("move");
		over(desktop);
		fire("mousemove", 60, 40);
		expect(drop(desktop)).toBe("move");
		over(null);
		fire("mousemove", 70, 40);
		expect(drop(desktop)).toBe("none");
		fire("mouseup", 70, 40);
		expect(drop(desktop)).toBeNull();
	});

	it("is removed when the drag ends otherwise: Escape, a lost stream, the source abandoning it", () => {
		for (const end of [
			() =>
				document.dispatchEvent(
					new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
				),
			() => losePointerStream("blur"),
		]) {
			const { desktop, over } = setup();
			over(null);
			fire("mousemove", 40, 40);
			expect(drop(desktop)).toBe("none");
			end();
			expect(drop(desktop)).toBeNull();
		}
		const { desktop, over, abandon } = setup();
		over(null);
		fire("mousemove", 40, 40);
		abandon();
		expect(drop(desktop)).toBeNull();
	});

	it("treats a target canDrop refuses as none: not highlighted, not dropped on", () => {
		const { desktop, folder, over, onDrop } = setup({
			canDrop: (target) => target.destination.kind === "desktop",
		});
		over(folder);
		fire("mousemove", 40, 40);
		expect(folder).not.toHaveClass("classicyFileDropTarget");
		expect(drop(desktop)).toBe("none");
		fire("mouseup", 40, 40);
		expect(onDrop).toHaveBeenCalledWith(null, [40, 40], [40, 40], "move");
	});

	it("treats a target taking no effect as none", () => {
		const { desktop, folder, over, onDrop } = setup({ effects: () => [] });
		over(folder);
		fire("mousemove", 40, 40);
		expect(drop(desktop)).toBe("none");
		fire("mouseup", 40, 40);
		expect(onDrop.mock.calls[0][0]).toBeNull();
	});
});

// A button-2 drag (the remaining chapters' audit's 5.33 / 11.7 / A.5; WIG
// Ch.5 "Nondefault Drag and Drop", pp.62-63): it ends at its button's
// release alone, in the source's transfer menu, and the browser's
// `contextmenu` after the release is swallowed.
describe("startClassicyFileDrag on button 2", () => {
	afterEach(() => {
		document.body.innerHTML = "";
		document.body.className = "";
	});

	const fire = (type: string, x: number, y: number, button = 2) =>
		document.dispatchEvent(
			new MouseEvent(type, { clientX: x, clientY: y, button, bubbles: true }),
		);
	const contextMenuReaches = () => {
		const event = new MouseEvent("contextmenu", {
			bubbles: true,
			cancelable: true,
		});
		const heard = vi.fn();
		document.body.addEventListener("contextmenu", heard);
		document.body.dispatchEvent(event);
		document.body.removeEventListener("contextmenu", heard);
		return heard.mock.calls.length > 0;
	};

	const setup = (hits: () => Element[]) => {
		const onDrop = vi.fn();
		const onMenu = vi.fn();
		const onClick = vi.fn();
		startClassicyFileDrag({
			start: { clientX: 10, clientY: 10 },
			parts: [],
			button: 2,
			onDrop,
			onMenu,
			onClick,
			elementsFromPoint: hits,
		});
		return { onDrop, onMenu, onClick };
	};

	it("ends at button 2's release over a target with onMenu, not onDrop, and swallows the contextmenu after it", () => {
		document.body.innerHTML = `<div id="folder" ${CLASSICY_DROP_FOLDER_ATTRIBUTE}="HD:Archive"></div>`;
		const folder = document.getElementById("folder") as Element;
		const { onDrop, onMenu } = setup(() => [folder]);
		fire("mousemove", 40, 40);
		// Another button's release does not end it.
		fire("mouseup", 40, 40, 0);
		expect(document.querySelector(".classicyFileDragGhost")).not.toBeNull();
		fire("mouseup", 40, 40);
		expect(onDrop).not.toHaveBeenCalled();
		expect(onMenu).toHaveBeenCalledWith(
			{ destination: { kind: "folder", path: "HD:Archive" }, element: folder },
			[40, 40],
			[40, 40],
			// What a plain drop there would do: the menu's default.
			"move",
		);
		expect(contextMenuReaches()).toBe(false);
		// Only the one.
		expect(contextMenuReaches()).toBe(true);
	});

	it("drops nothing over no target, still swallowing the contextmenu", () => {
		const { onDrop, onMenu } = setup(() => []);
		fire("mousemove", 40, 40);
		fire("mouseup", 40, 40);
		expect(onMenu).not.toHaveBeenCalled();
		expect(onDrop).toHaveBeenCalledWith(null, [40, 40], [40, 40], "move");
		expect(contextMenuReaches()).toBe(false);
	});

	it("leaves a right-click that never dragged its contextmenu", () => {
		const { onClick, onMenu } = setup(() => []);
		fire("mouseup", 10, 10);
		expect(onClick).toHaveBeenCalledOnce();
		expect(onMenu).not.toHaveBeenCalled();
		expect(contextMenuReaches()).toBe(true);
	});
});

// The copy modifier (the remaining chapters' audit's 5.34 / A.8; WIG Ch.5
// "Shortcut Keys for Transfer Operations", pp.67-68; App. A Table A.3
// notes 2-3): under `layout.transfer.copyModifier` "ctrl", Control at the
// release copies, Control with Shift makes shortcuts, read on each move,
// on Control and Shift presses and at the release, never at the press.
describe("startClassicyFileDrag's copy modifier", () => {
	let restore: () => void = () => {};
	afterEach(() => {
		restore();
		restore = () => {};
		document.body.innerHTML = "";
		document.body.className = "";
		vi.restoreAllMocks();
	});

	const mouse = (
		type: string,
		x: number,
		y: number,
		keys: { ctrlKey?: boolean; shiftKey?: boolean } = {},
	) =>
		document.dispatchEvent(
			new MouseEvent(type, { clientX: x, clientY: y, bubbles: true, ...keys }),
		);
	const key = (
		type: "keydown" | "keyup",
		name: string,
		keys: { ctrlKey?: boolean; shiftKey?: boolean },
	) =>
		document.dispatchEvent(
			new KeyboardEvent(type, { key: name, bubbles: true, ...keys }),
		);

	// A drag whose target is a folder element apart from its source.
	const drag = (
		folderPath = "HD:Archive",
		start: { ctrlKey?: boolean; shiftKey?: boolean } = {},
		effects?: Parameters<typeof startClassicyFileDrag>[0]["effects"],
	) => {
		document.body.innerHTML = `<div class="classicyDesktop" id="desktop"><div id="icon"></div><div id="folder" ${CLASSICY_DROP_FOLDER_ATTRIBUTE}="${folderPath}"></div></div>`;
		const desktop = document.getElementById("desktop") as Element;
		const folder = document.getElementById("folder") as Element;
		const onDrop = vi.fn();
		startClassicyFileDrag({
			start: { clientX: 10, clientY: 10, ...start },
			parts: [],
			source: document.getElementById("icon"),
			onDrop,
			...(effects ? { effects } : {}),
			elementsFromPoint: () => [folder],
		});
		return { desktop, onDrop, effect: () => onDrop.mock.calls[0]?.[3] };
	};
	const windowsLayout = () => {
		restore = activateTestWindowsKeysPackage({
			transfer: { copyModifier: "ctrl" },
		});
	};

	it("copies with Control held at the release, and shows it on the desktop root", () => {
		windowsLayout();
		const { desktop, effect } = drag();
		mouse("mousemove", 40, 40, { ctrlKey: true });
		expect(desktop.getAttribute("data-classicy-drop")).toBe("copy");
		mouse("mouseup", 40, 40, { ctrlKey: true });
		expect(effect()).toBe("copy");
		// Gone once the drag ends.
		expect(desktop.hasAttribute("data-classicy-drop")).toBe(false);
	});

	it("reads the release, not the press: Control let go before it moves", () => {
		windowsLayout();
		const { effect } = drag("HD:Archive", { ctrlKey: true });
		mouse("mousemove", 40, 40, { ctrlKey: true });
		mouse("mouseup", 40, 40);
		expect(effect()).toBe("move");
	});

	it("follows Control and Shift pressed and let go under a still pointer", () => {
		windowsLayout();
		const { desktop, effect } = drag();
		mouse("mousemove", 40, 40);
		expect(desktop.getAttribute("data-classicy-drop")).toBe("move");
		key("keydown", "Control", { ctrlKey: true });
		expect(desktop.getAttribute("data-classicy-drop")).toBe("copy");
		key("keydown", "Shift", { ctrlKey: true, shiftKey: true });
		expect(desktop.getAttribute("data-classicy-drop")).toBe("link");
		key("keyup", "Shift", { ctrlKey: true });
		expect(desktop.getAttribute("data-classicy-drop")).toBe("copy");
		key("keyup", "Control", {});
		expect(desktop.getAttribute("data-classicy-drop")).toBe("move");
		mouse("mouseup", 40, 40, { ctrlKey: true, shiftKey: true });
		expect(effect()).toBe("link");
	});

	it("moves into the Trash whatever is held, and where the target takes no copy", () => {
		windowsLayout();
		const trash = drag("Trash");
		mouse("mousemove", 40, 40, { ctrlKey: true });
		expect(trash.desktop.getAttribute("data-classicy-drop")).toBe("move");
		mouse("mouseup", 40, 40, { ctrlKey: true });
		expect(trash.effect()).toBe("move");
		const moveOnly = drag("HD:Archive", {}, () => ["move"]);
		mouse("mousemove", 40, 40, { ctrlKey: true });
		mouse("mouseup", 40, 40, { ctrlKey: true });
		expect(moveOnly.effect()).toBe("move");
	});

	it("moves throughout a press that began with Control on a Mac host", () => {
		windowsLayout();
		vi.spyOn(navigator, "platform", "get").mockReturnValue("MacIntel");
		const { desktop, effect } = drag("HD:Archive", { ctrlKey: true });
		mouse("mousemove", 40, 40, { ctrlKey: true });
		expect(desktop.getAttribute("data-classicy-drop")).toBe("move");
		mouse("mouseup", 40, 40, { ctrlKey: true });
		expect(effect()).toBe("move");
	});

	it("always moves without the key, as Mac OS 8's Finder does", () => {
		const { desktop, effect } = drag();
		mouse("mousemove", 40, 40, { ctrlKey: true });
		expect(desktop.getAttribute("data-classicy-drop")).toBe("move");
		mouse("mouseup", 40, 40, { ctrlKey: true, shiftKey: true });
		expect(effect()).toBe("move");
	});
});

// The velocity rule (the remaining chapters' audit's 5.35; WIG Ch.5
// "Scrolling When Transferring by Dragging", pp.64-65, Figure 5.14;
// Windows 98 SE's DAD_AutoScroll): under `layout.transfer.autoScroll`.
describe("startClassicyFileDrag's velocity rule", () => {
	let restore: () => void = () => {};
	let unregister: (() => void) | null = null;
	afterEach(() => {
		restore();
		restore = () => {};
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

	/** A registered viewport 300 x 200 at the origin over 300 x 1000 px. */
	const viewportOf = () => {
		document.body.innerHTML = `<div id="classicyDesktop" style="--desktop-icon-size: 32px; --icon-small-size: 16px"><div id="viewport"><div id="row" ${CLASSICY_DROP_FOLDER_ATTRIBUTE}="HD:Archive"></div></div></div>`;
		const viewport = document.getElementById("viewport") as HTMLElement;
		const row = document.getElementById("row") as HTMLElement;
		const position = { top: 0 };
		for (const [k, value] of Object.entries({
			scrollWidth: 300,
			scrollHeight: 1000,
			clientWidth: 300,
			clientHeight: 200,
			scrollLeft: 0,
		})) {
			Object.defineProperty(viewport, k, { value, configurable: true });
		}
		Object.defineProperty(viewport, "scrollTop", {
			configurable: true,
			get: () => position.top,
		});
		vi.spyOn(viewport, "getBoundingClientRect").mockReturnValue(
			DOMRect.fromRect({ x: 0, y: 0, width: 300, height: 200 }),
		);
		const scrollBy = vi.fn((_dx: number, dy: number) => {
			position.top = Math.min(Math.max(position.top + dy, 0), 800);
		});
		unregister = registerClassicyScrollViewport(viewport, {
			lineStep: () => 16,
			scrollBy,
		});
		return { row, scrollBy };
	};
	const start = (row: Element) =>
		startClassicyFileDrag({
			start: { clientX: 150, clientY: 100 },
			parts: [],
			onDrop: vi.fn(),
			elementsFromPoint: () => [row],
		});

	it("scrolls a line once the pointer rests in the zone, then every 250 ms", () => {
		vi.useFakeTimers();
		restore = activateTestWindowsKeysPackage({
			transfer: { autoScroll: true },
		});
		const { row, scrollBy } = viewportOf();
		start(row);
		// 20 px inside the bottom edge (the zone is the 32 px icon size).
		fire("mousemove", 150, 180);
		// Two samples: not yet three.
		vi.advanceTimersByTime(100);
		expect(scrollBy).not.toHaveBeenCalled();
		// The third, the pointer still: velocity 0, a line down.
		vi.advanceTimersByTime(100);
		expect(scrollBy).toHaveBeenCalledTimes(1);
		expect(scrollBy).toHaveBeenLastCalledWith(0, 16);
		// Not again before 250 ms: the 300 ms sample is the next.
		vi.advanceTimersByTime(200);
		expect(scrollBy).toHaveBeenCalledTimes(1);
		vi.advanceTimersByTime(100);
		expect(scrollBy).toHaveBeenCalledTimes(2);
		fire("mouseup", 150, 180);
		vi.advanceTimersByTime(1000);
		expect(scrollBy).toHaveBeenCalledTimes(2);
	});

	it("scrolls nothing while the pointer moves fast in the zone, or rests outside it", () => {
		vi.useFakeTimers();
		restore = activateTestWindowsKeysPackage({
			transfer: { autoScroll: true },
		});
		const { row, scrollBy } = viewportOf();
		start(row);
		// Moving along the bottom edge, 20 px a sample.
		for (let i = 0; i < 6; i++) {
			fire("mousemove", 40 + i * 20, 180);
			vi.advanceTimersByTime(50);
		}
		expect(scrollBy).not.toHaveBeenCalled();
		// Resting in the middle.
		fire("mousemove", 150, 100);
		vi.advanceTimersByTime(1000);
		expect(scrollBy).not.toHaveBeenCalled();
		fire("mouseup", 150, 100);
	});

	it("keeps today's band and rate without the key", () => {
		vi.useFakeTimers();
		const { row, scrollBy } = viewportOf();
		start(row);
		// 20 px inside: outside today's line-step band, so nothing.
		fire("mousemove", 150, 180);
		vi.advanceTimersByTime(1000);
		expect(scrollBy).not.toHaveBeenCalled();
		// In the band: a line per press-repeat interval.
		fire("mousemove", 150, 190);
		vi.advanceTimersByTime(CLASSICY_PRESS_REPEAT_INTERVAL_MS);
		expect(scrollBy).toHaveBeenCalledTimes(1);
		fire("mouseup", 150, 190);
	});
});
