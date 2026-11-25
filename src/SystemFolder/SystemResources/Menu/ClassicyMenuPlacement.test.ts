// The measurement behind "menus open where they show"
// (ClassicyMenuPlacement.internal.ts): the box a menu keeps to, what it
// paints (its frame's shadow included) and where it goes across.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyMenuBox,
	classicyMenuBounds,
	classicyMenuInkBox,
	classicyMenuLeftAt,
	classicyMenuPassesEnd,
	classicyMenuPinShift,
} from "@/SystemFolder/SystemResources/Menu/ClassicyMenuPlacement.internal";
import { setClassicyTaskbarBand } from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";

const box = (left: number, right: number): ClassicyMenuBox => ({
	left,
	right,
	top: 0,
	bottom: 10,
});
const desktop = box(0, 640);

afterEach(() => {
	vi.restoreAllMocks();
	document.body.innerHTML = "";
});

describe("classicyMenuBounds", () => {
	it("is the desktop's box", () => {
		const root = document.createElement("div");
		root.className = "classicyDesktop";
		const inner = document.createElement("span");
		root.append(inner);
		document.body.append(root);
		vi.spyOn(root, "getBoundingClientRect").mockReturnValue(
			DOMRect.fromRect({ x: 16, y: 16, width: 992, height: 736 }),
		);
		expect(classicyMenuBounds(inner)).toEqual({
			left: 16,
			top: 16,
			right: 1008,
			bottom: 752,
		});
	});

	it("is the overlap of the desktop's box and the viewport's", () => {
		// A desktop wider and taller than the window (a host that fixes its
		// size, or a scrolled page): menus keep to what shows.
		const root = document.createElement("div");
		root.className = "classicyDesktop";
		document.body.append(root);
		vi.spyOn(root, "getBoundingClientRect").mockReturnValue(
			DOMRect.fromRect({ x: -50, y: -20, width: 1400, height: 900 }),
		);
		expect(classicyMenuBounds(root)).toEqual({
			left: 0,
			top: 0,
			right: window.innerWidth,
			bottom: window.innerHeight,
		});
	});

	it("is the viewport's without a desktop, or with one not laid out", () => {
		const viewport = {
			left: 0,
			top: 0,
			right: window.innerWidth,
			bottom: window.innerHeight,
		};
		expect(classicyMenuBounds(null)).toEqual(viewport);
		const root = document.createElement("div");
		root.className = "classicyDesktop";
		document.body.append(root);
		expect(classicyMenuBounds(root)).toEqual(viewport);
	});

	// Plan 0020-w98 §2 "Menus": a mounted taskbar's band comes off the
	// bottom of the box every menu keeps to (Wine keeps a popup menu to the
	// work area, `MENU_ShowPopup`), and nothing else moves.
	describe("above a taskbar's band", () => {
		const desktopAt = (rect: DOMRectInit) => {
			const root = document.createElement("div");
			root.className = "classicyDesktop";
			document.body.append(root);
			vi.spyOn(root, "getBoundingClientRect").mockReturnValue(
				DOMRect.fromRect(rect),
			);
			return root;
		};
		const embedded = { x: 16, y: 16, width: 992, height: 736 };
		const oversized = { x: -50, y: -20, width: 1400, height: 900 };
		const viewport = () => ({
			left: 0,
			top: 0,
			right: window.innerWidth,
			bottom: window.innerHeight,
		});

		it("a band of 0 is today's box", () => {
			const root = desktopAt(embedded);
			const before = classicyMenuBounds(root);
			setClassicyTaskbarBand(28);
			setClassicyTaskbarBand(0);
			expect(classicyMenuBounds(root)).toEqual(before);
			expect(before).toEqual({ left: 16, top: 16, right: 1008, bottom: 752 });
		});

		it("takes the band off the desktop's bottom, and only its bottom", () => {
			const root = desktopAt(embedded);
			setClassicyTaskbarBand(28);
			expect(classicyMenuBounds(root)).toEqual({
				left: 16,
				top: 16,
				right: 1008,
				bottom: 724,
			});
		});

		it("measures the band from the desktop's own bottom, then cuts to the viewport", () => {
			// The desktop ends 112 px below the window: its taskbar (bottom 880,
			// top 852) is off screen, so the viewport's bottom still binds.
			const root = desktopAt(oversized);
			setClassicyTaskbarBand(28);
			expect(classicyMenuBounds(root)).toEqual(viewport());
		});

		it("takes the band off the viewport where the viewport stands in", () => {
			setClassicyTaskbarBand(28);
			expect(classicyMenuBounds(null)).toEqual({
				...viewport(),
				bottom: window.innerHeight - 28,
			});
		});

		it("falls back to the viewport when the band leaves no room", () => {
			const root = desktopAt({ x: 0, y: 0, width: 640, height: 20 });
			setClassicyTaskbarBand(28);
			expect(classicyMenuBounds(root)).toEqual(viewport());
		});
	});
});

describe("classicyMenuInkBox", () => {
	const list = (
		rect: { x: number; width: number },
		own: Record<string, string>,
		pseudos: Record<string, Record<string, string>> = {},
	) => {
		const el = document.createElement("ul");
		vi.spyOn(el, "getBoundingClientRect").mockReturnValue(
			DOMRect.fromRect({ x: rect.x, y: 20, width: rect.width, height: 50 }),
		);
		const computed = window.getComputedStyle;
		vi.spyOn(window, "getComputedStyle").mockImplementation(
			(target: Element, pseudo?: string | null) => {
				if (target !== el) return computed.call(window, target, pseudo);
				if (pseudo)
					return (pseudos[pseudo] ?? {
						content: "none",
					}) as unknown as CSSStyleDeclaration;
				return own as unknown as CSSStyleDeclaration;
			},
		);
		return el;
	};
	const border = {
		borderLeftWidth: "1px",
		borderRightWidth: "1px",
		borderTopWidth: "1px",
		borderBottomWidth: "1px",
	};

	it("counts a frame's shadow drawn by an absolutely placed pseudo-element", () => {
		// System 7's and Platinum's: `right: -2px; width: 1px` from the padding
		// box, a pixel past the frame (the computed `left` is the used value).
		const el = list({ x: 100, width: 160 }, border, {
			"::after": {
				content: '""',
				display: "block",
				position: "absolute",
				boxSizing: "content-box",
				left: "159px",
				right: "-2px",
				top: "2px",
				width: "1px",
				height: "48px",
			},
		});
		const ink = classicyMenuInkBox(el);
		expect(ink?.left).toBe(100);
		expect(ink?.right).toBe(261);
	});

	it("places a pseudo-element by its right inset when its left is not a length", () => {
		const el = list({ x: 100, width: 160 }, border, {
			"::before": {
				content: '""',
				display: "block",
				position: "absolute",
				left: "auto",
				right: "-2px",
				top: "auto",
				bottom: "-2px",
				width: "1px",
				height: "1px",
			},
		});
		expect(classicyMenuInkBox(el)?.right).toBe(261);
	});

	it("leaves out a pseudo-element that is not generated, hidden or in flow", () => {
		const pseudos: Record<string, string>[] = [
			{ content: "none", position: "absolute", left: "500px", width: "1px" },
			{
				content: '""',
				display: "none",
				position: "absolute",
				left: "500px",
				width: "1px",
			},
			{ content: '""', position: "static", left: "500px", width: "1px" },
		];
		for (const pseudo of pseudos) {
			vi.restoreAllMocks();
			const el = list({ x: 100, width: 160 }, border, { "::after": pseudo });
			expect(classicyMenuInkBox(el)?.right).toBe(260);
		}
	});

	it("counts an outer box-shadow, not an inset one", () => {
		// Platinum's pop-up list.
		const el = list(
			{ x: 100, width: 160 },
			{
				...border,
				boxShadow:
					"rgb(255, 255, 255) 1px 1px 0px 0px inset, rgb(0, 0, 0) 2px 2px 0px 0px",
			},
		);
		const ink = classicyMenuInkBox(el);
		expect(ink?.left).toBe(100);
		expect(ink?.right).toBe(262);
		expect(ink?.bottom).toBe(72);
	});

	it("is the union of every element's, and null for none", () => {
		const a = document.createElement("div");
		const b = document.createElement("div");
		vi.spyOn(a, "getBoundingClientRect").mockReturnValue(
			DOMRect.fromRect({ x: 10, y: 0, width: 20, height: 5 }),
		);
		vi.spyOn(b, "getBoundingClientRect").mockReturnValue(
			DOMRect.fromRect({ x: 25, y: 3, width: 20, height: 5 }),
		);
		expect(classicyMenuInkBox(a, null, b)).toEqual({
			left: 10,
			top: 0,
			right: 45,
			bottom: 8,
		});
		expect(classicyMenuInkBox(null, undefined)).toBeNull();
	});
});

describe("classicyMenuPassesEnd and classicyMenuPinShift", () => {
	it("passes the end only past the right edge, a layout fraction aside", () => {
		expect(classicyMenuPassesEnd(box(500, 640), desktop)).toBe(false);
		expect(classicyMenuPassesEnd(box(500, 640.001), desktop)).toBe(false);
		expect(classicyMenuPassesEnd(box(500, 641), desktop)).toBe(true);
	});

	it("does not move a menu that lies inside", () =>
		expect(classicyMenuPinShift(box(10, 600), desktop)).toBe(0));

	it("moves one back from the right edge", () =>
		expect(classicyMenuPinShift(box(600, 650), desktop)).toBe(-10));

	it("moves one in from the left edge", () =>
		expect(classicyMenuPinShift(box(-15, 605), desktop)).toBe(15));

	it("keeps the left side of one wider than the desktop", () =>
		expect(classicyMenuPinShift(box(-95, 605), box(0, 640))).toBe(95));
});

describe("classicyMenuLeftAt", () => {
	// A 100 px frame whose shadow reaches a pixel past its right side.
	const at = (left: number, endAt: number, width = 100) =>
		classicyMenuLeftAt(left, endAt, width, 0, 1, desktop);

	it("keeps a menu where asked when it fits, shadow included", () =>
		expect(at(539, 600)).toBe(539));

	it("puts its right side at the end when it would pass the right edge", () => {
		expect(at(540, 600)).toBe(500);
		expect(at(600, 630)).toBe(530);
	});

	it("pins it inside when it is still too wide", () => {
		expect(at(600, 630, 700)).toBe(0);
		// Its right side at the edge, its shadow past it: back by the shadow.
		expect(at(600, 640)).toBe(539);
	});
});
