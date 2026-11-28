import { afterEach, describe, expect, it, vi } from "vitest";
import {
	registerClassicyAppearancePackage,
	resetClassicyAppearancePackagesForTests,
} from "@/Appearance/ClassicyAppearancePackage";
import { CLASSICY_CORE_DEFAULT_THEME } from "@/Appearance/ClassicyCoreTheme";
// The Windows-layout package below needs a sound pack registered.
import "../../../../packages/appearance/platinum/src/assets/sounds/platinum";
import {
	losePointerStream,
	POINTER_STREAM_LOSSES,
} from "@/__tests__/losePointerStream";
import {
	type ClassicyFileBrowserMarqueeBox,
	classicyFileBrowserMarqueeScroll,
	startClassicyFileBrowserMarquee,
} from "@/SystemFolder/SystemResources/File/ClassicyFileBrowserMarquee.internal";
import { registerClassicyScrollViewport } from "@/SystemFolder/SystemResources/ScrollArea/ClassicyScrollViewportRegistry.internal";
import windows98 from "../../../../packages/appearance/windows98/src/windows98.json";

afterEach(() => {
	document.body.replaceChildren();
	vi.useRealTimers();
	resetClassicyAppearancePackagesForTests();
});

const rect = (left: number, top: number, width: number, height: number) =>
	DOMRect.fromRect({ x: left, y: top, width, height });

// A holder at (100, 100), 300 x 300, holding two items, and the viewport it
// scrolls in, 300 x 200, its content 600 tall.
const setUp = () => {
	const viewport = document.createElement("div");
	const holder = document.createElement("div");
	viewport.append(holder);
	document.body.append(viewport);
	let holderTop = 100;
	holder.getBoundingClientRect = () => rect(100, holderTop, 300, 300);
	viewport.getBoundingClientRect = () => rect(100, 100, 300, 200);
	Object.defineProperty(viewport, "scrollHeight", { value: 600 });
	Object.defineProperty(viewport, "clientHeight", { value: 200 });
	Object.defineProperty(viewport, "scrollWidth", { value: 300 });
	Object.defineProperty(viewport, "clientWidth", { value: 300 });
	const items = ["a", "b"].map((path, i) => {
		const el = document.createElement("div");
		el.setAttribute("data-classicy-file-path", path);
		// Each item 40 px square, `a` at the holder's (10, 10), `b` at (10, 110).
		el.getBoundingClientRect = () =>
			rect(110, holderTop + 10 + i * 100, 40, 40);
		holder.append(el);
		return el;
	});
	const scrollBy = vi.fn((_dx: number, dy: number) => {
		holderTop -= dy;
	});
	const stopRegistration = registerClassicyScrollViewport(viewport, {
		lineStep: () => 16,
		scrollBy,
	});
	const boxes: (ClassicyFileBrowserMarqueeBox | null)[] = [];
	const touched: string[][] = [];
	const start = (
		extra: Partial<Parameters<typeof startClassicyFileBrowserMarquee>[0]> = {},
	) =>
		startClassicyFileBrowserMarquee({
			holder,
			start: { clientX: 105, clientY: 105 },
			items: () => holder.querySelectorAll("[data-classicy-file-path]"),
			onBox: (box) => boxes.push(box),
			onTouched: (paths) => touched.push(paths),
			...extra,
		});
	return { holder, items, scrollBy, stopRegistration, boxes, touched, start };
};

const move = (clientX: number, clientY: number) =>
	document.dispatchEvent(new MouseEvent("mousemove", { clientX, clientY }));
const release = () => document.dispatchEvent(new MouseEvent("mouseup"));

describe("classicyFileBrowserMarqueeScroll", () => {
	const r = { left: 0, top: 0, right: 300, bottom: 200 };
	const axes = (y: number) => ({
		x: { total: 300, visible: 300, position: 0 },
		y: { total: 600, visible: 200, position: y },
	});
	it("scrolls a line toward an edge the pointer is within a line of, or past", () => {
		expect(classicyFileBrowserMarqueeScroll(10, 190, r, axes(0), 16)).toEqual({
			dx: 0,
			dy: 16,
		});
		expect(classicyFileBrowserMarqueeScroll(10, 900, r, axes(0), 16)).toEqual({
			dx: 0,
			dy: 16,
		});
		expect(classicyFileBrowserMarqueeScroll(10, -50, r, axes(100), 16)).toEqual(
			{ dx: 0, dy: -16 },
		);
	});

	it("never scrolls past an end, nor an axis that fits, nor clear of the edges", () => {
		expect(classicyFileBrowserMarqueeScroll(10, -50, r, axes(0), 16)).toEqual({
			dx: 0,
			dy: 0,
		});
		expect(classicyFileBrowserMarqueeScroll(10, 900, r, axes(400), 16)).toEqual(
			{ dx: 0, dy: 0 },
		);
		// Across, the content fits.
		expect(classicyFileBrowserMarqueeScroll(-50, 100, r, axes(0), 16)).toEqual({
			dx: 0,
			dy: 0,
		});
		expect(classicyFileBrowserMarqueeScroll(150, 100, r, axes(50), 16)).toEqual(
			{ dx: 0, dy: 0 },
		);
	});
});

describe("startClassicyFileBrowserMarquee", () => {
	it("draws nothing until the pointer travels 2 px, then the rectangle and the items it touches", () => {
		const { boxes, touched, start } = setUp();
		start();
		move(106, 106);
		expect(boxes).toEqual([]);
		move(160, 130);
		expect(boxes.at(-1)).toEqual({ left: 5, top: 5, width: 55, height: 25 });
		expect(touched.at(-1)).toEqual(["a"]);
		move(120, 240);
		expect(touched.at(-1)).toEqual(["a", "b"]);
		release();
		expect(boxes.at(-1)).toBeNull();
		// Nothing more after the release.
		const count = touched.length;
		move(300, 300);
		expect(touched).toHaveLength(count);
	});

	it.each(
		POINTER_STREAM_LOSSES,
	)("ends when the pointer stream is lost (%s)", (loss) => {
		const onEnd = vi.fn();
		const { boxes, start } = setUp();
		start({ onEnd });
		move(160, 160);
		losePointerStream(loss);
		expect(boxes.at(-1)).toBeNull();
		expect(onEnd).toHaveBeenCalledOnce();
	});

	it("ends with nothing more reported when stopped", () => {
		const onEnd = vi.fn();
		const { boxes, touched, start } = setUp();
		const stop = start({ onEnd });
		move(160, 160);
		stop();
		expect(boxes.at(-1)).toBeNull();
		const count = touched.length;
		move(200, 200);
		release();
		expect(touched).toHaveLength(count);
		expect(onEnd).not.toHaveBeenCalled();
	});

	it("scrolls the holder's viewport while the pointer is past its edge, measuring again", () => {
		vi.useFakeTimers();
		const { scrollBy, touched, start } = setUp();
		start({ autoScroll: true });
		move(120, 150);
		expect(touched.at(-1)).toEqual(["a"]);
		// Past the viewport's bottom (300).
		move(120, 320);
		vi.advanceTimersByTime(119);
		expect(scrollBy).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		expect(scrollBy).toHaveBeenCalledWith(0, 16);
		// The holder moved up under the still pointer: the rectangle, from
		// the press's place in the holder, now reaches b.
		vi.advanceTimersByTime(120 * 4);
		expect(touched.at(-1)).toEqual(["a", "b"]);
		release();
		const calls = scrollBy.mock.calls.length;
		vi.advanceTimersByTime(600);
		expect(scrollBy).toHaveBeenCalledTimes(calls);
	});

	it("never scrolls without autoScroll", () => {
		vi.useFakeTimers();
		const { scrollBy, start } = setUp();
		start();
		move(120, 320);
		vi.advanceTimersByTime(600);
		expect(scrollBy).not.toHaveBeenCalled();
		release();
	});

	it("cancels on Escape under input.escapeCancels, and ignores it otherwise", () => {
		const onCancel = vi.fn();
		const onEnd = vi.fn();
		const plain = setUp();
		plain.start({ onCancel, onEnd });
		move(160, 160);
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
		expect(onCancel).not.toHaveBeenCalled();
		expect(plain.boxes.at(-1)).not.toBeNull();
		release();
		expect(onEnd).toHaveBeenCalledOnce();
		document.body.replaceChildren();

		registerClassicyAppearancePackage({
			id: "windows-marquee",
			name: "Windows marquee",
			css: "",
			defaults: {
				...CLASSICY_CORE_DEFAULT_THEME,
				id: "windows-marquee-default",
				package: "windows-marquee",
			},
			layout: windows98.layout as never,
		});
		onEnd.mockClear();
		const windows = setUp();
		windows.start({ onCancel, onEnd });
		move(160, 160);
		const escapeKey = new KeyboardEvent("keydown", {
			key: "Escape",
			cancelable: true,
		});
		document.dispatchEvent(escapeKey);
		expect(escapeKey.defaultPrevented).toBe(true);
		expect(onCancel).toHaveBeenCalledOnce();
		expect(onEnd).toHaveBeenCalledOnce();
		expect(windows.boxes.at(-1)).toBeNull();
		// The release after it changes nothing.
		release();
		expect(onEnd).toHaveBeenCalledOnce();
	});
});
