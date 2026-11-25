import { afterEach, describe, expect, it } from "vitest";
import {
	classicyMaximizedWindowRect,
	classicyWindowChromeEdges,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowMaximize";

// Plan 0020-w98 §5, "Maximize and restore": a maximized window's content box
// is the work area (WIG Ch.6 "Maximizing Windows", p.84: "as large as the
// display, excluding the space used by the taskbar"), its frame just outside
// it, as Windows 95/98 grows a maximized window's rect by its frame on every
// side (Wine: at (-SM_CXFRAME, -SM_CYFRAME), SM_CXMAXIMIZED the screen plus
// two frames).
describe("classicyMaximizedWindowRect", () => {
	const NO_CHROME = { left: 0, top: 0, right: 0, bottom: 0 };
	const FRAME = { left: 4, top: 4, right: 4, bottom: 4 };

	it("fills the desktop with no bands and no chrome", () => {
		expect(
			classicyMaximizedWindowRect({
				width: 1024,
				height: 768,
				top: 0,
				bottomBand: 0,
				chrome: NO_CHROME,
			}),
		).toEqual({ position: [0, 0], size: [1024, 768] });
	});

	it("puts the frame outside the work area, so the caption meets the top and sides", () => {
		expect(
			classicyMaximizedWindowRect({
				width: 1024,
				height: 768,
				top: 0,
				bottomBand: 0,
				chrome: FRAME,
			}),
		).toEqual({ position: [-4, -4], size: [1024, 768] });
	});

	it("leaves the taskbar's band out of the height", () => {
		expect(
			classicyMaximizedWindowRect({
				width: 1024,
				height: 768,
				top: 0,
				bottomBand: 28,
				chrome: FRAME,
			}),
		).toEqual({ position: [-4, -4], size: [1024, 740] });
	});

	it("starts under the menu bar's band, with the frame above its edge", () => {
		expect(
			classicyMaximizedWindowRect({
				width: 800,
				height: 600,
				top: 20,
				bottomBand: 28,
				chrome: FRAME,
			}),
		).toEqual({ position: [-4, 16], size: [800, 552] });
	});

	it("offsets each side by its own chrome; the right and bottom only lie outside", () => {
		expect(
			classicyMaximizedWindowRect({
				width: 640,
				height: 480,
				top: 0,
				bottomBand: 0,
				chrome: { left: 7, top: 3, right: 50, bottom: 50 },
			}),
		).toEqual({ position: [-7, -3], size: [640, 480] });
	});

	it("never gives a negative size", () => {
		expect(
			classicyMaximizedWindowRect({
				width: 0,
				height: 20,
				top: 20,
				bottomBand: 28,
				chrome: NO_CHROME,
			}).size,
		).toEqual([0, 0]);
	});
});

describe("classicyWindowChromeEdges", () => {
	let el: HTMLElement | undefined;
	afterEach(() => el?.remove());

	it("is each side's padding plus its border", () => {
		el = document.createElement("div");
		el.style.padding = "4px 5px 6px 7px";
		el.style.borderStyle = "solid";
		el.style.borderWidth = "1px 2px 3px 0px";
		document.body.append(el);
		expect(classicyWindowChromeEdges(el)).toEqual({
			left: 7,
			top: 5,
			right: 7,
			bottom: 9,
		});
	});

	it("is 0 on a side with nothing set", () => {
		el = document.createElement("div");
		document.body.append(el);
		expect(classicyWindowChromeEdges(el)).toEqual({
			left: 0,
			top: 0,
			right: 0,
			bottom: 0,
		});
	});
});
