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
	findClassicyFileDropTarget,
	startClassicyFileDrag,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDrag";
import { traceClassicyDragOutline } from "@/SystemFolder/SystemResources/File/ClassicyFileDragOutline";
import {
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

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
		expect(onEnd).toHaveBeenCalledWith({ dropped: true, canceled: false });
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
		expect(onEnd).toHaveBeenCalledWith({ dropped: false, canceled: false });
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
		expect(onEnd).toHaveBeenCalledWith({ dropped: false, canceled: true });
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
		expect(onEnd).toHaveBeenCalledWith({ dropped: false, canceled: true });
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
		expect(onEnd).toHaveBeenCalledWith({ dropped: false, canceled: true });
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
