import { afterEach, describe, expect, it, vi } from "vitest";
import {
	CLASSICY_WINDOW_KEYBOARD_STEP,
	type ClassicyWindowArrowKey,
	type ClassicyWindowKeyboardModeHandlers,
	classicyKeyboardSizingEdges,
	classicyWindowKeyboardStep,
	classicyWindowSizingEdgesAt,
	isClassicyWindowArrowKey,
	isClassicyWindowKeyboardModeActive,
	startClassicyWindowKeyboardMode,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindowKeyboardMove.internal";
import type { ClassicyWindowSizingEdges } from "@/SystemFolder/SystemResources/Window/ClassicyWindowResize";

// Plan 0020-w98 §5 "Keyboard Move and Size": the pure parts and the input
// capture of Windows' SC_MOVE/SC_SIZE loop (Wine's `WINPOS_SysCommandSizeMove`
// and `start_size_move`, ReactOS's `DefWndDoSizeMove`).

describe("the keyboard step", () => {
	it("is Windows' 8 px", () => {
		expect(CLASSICY_WINDOW_KEYBOARD_STEP).toBe(8);
	});

	it.each<[ClassicyWindowArrowKey, [number, number]]>([
		["ArrowUp", [0, -8]],
		["ArrowDown", [0, 8]],
		["ArrowLeft", [-8, 0]],
		["ArrowRight", [8, 0]],
	])("moves %s by %j", (key, step) => {
		expect(classicyWindowKeyboardStep(key)).toEqual(step);
	});

	it("knows the four arrow keys and nothing else", () => {
		for (const key of ["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"])
			expect(isClassicyWindowArrowKey(key)).toBe(true);
		for (const key of ["Up", "Enter", "a", "toString", "constructor"])
			expect(isClassicyWindowArrowKey(key)).toBe(false);
	});
});

describe("classicyKeyboardSizingEdges", () => {
	// Wine's start_size_move: VK_UP picks HTTOP, VK_DOWN HTBOTTOM, VK_LEFT
	// HTLEFT, VK_RIGHT HTRIGHT.
	it.each<[ClassicyWindowArrowKey, ClassicyWindowSizingEdges]>([
		["ArrowUp", "top"],
		["ArrowDown", "bottom"],
		["ArrowLeft", "left"],
		["ArrowRight", "right"],
	])("with no edge chosen, %s picks the %s edge", (key, edge) => {
		expect(classicyKeyboardSizingEdges(null, key)).toBe(edge);
	});

	it.each<
		[
			ClassicyWindowSizingEdges,
			ClassicyWindowArrowKey,
			ClassicyWindowSizingEdges,
		]
	>([
		["top", "ArrowLeft", "top-left"],
		["top", "ArrowRight", "top-right"],
		["bottom", "ArrowLeft", "bottom-left"],
		["bottom", "ArrowRight", "bottom-right"],
		["left", "ArrowUp", "top-left"],
		["left", "ArrowDown", "bottom-left"],
		["right", "ArrowUp", "top-right"],
		["right", "ArrowDown", "bottom-right"],
	])("an arrow across %s, %s, makes the %s corner", (edges, key, corner) => {
		expect(classicyKeyboardSizingEdges(edges, key)).toBe(corner);
	});

	it.each<[ClassicyWindowSizingEdges, ClassicyWindowArrowKey]>([
		["top", "ArrowUp"],
		["top", "ArrowDown"],
		["bottom", "ArrowUp"],
		["left", "ArrowLeft"],
		["left", "ArrowRight"],
		["right", "ArrowLeft"],
	])("an arrow along %s's axis, %s, keeps it", (edges, key) => {
		expect(classicyKeyboardSizingEdges(edges, key)).toBe(edges);
	});

	it("keeps a corner whatever the arrow", () => {
		for (const corner of [
			"top-left",
			"top-right",
			"bottom-left",
			"bottom-right",
		] as const)
			for (const key of [
				"ArrowUp",
				"ArrowDown",
				"ArrowLeft",
				"ArrowRight",
			] as const)
				expect(classicyKeyboardSizingEdges(corner, key)).toBe(corner);
	});
});

describe("classicyWindowSizingEdgesAt", () => {
	// A window 100..500 across and 100..400 down, a 4 px frame and corners
	// reaching 18 px past the frame's inside (Windows 98's SM_CXFRAME and
	// SM_CXSIZE): the inside is 104..496 by 104..396.
	const rect = { left: 100, top: 100, right: 500, bottom: 400 };
	const at = (x: number, y: number) =>
		classicyWindowSizingEdgesAt(rect, [x, y], 4, 18);

	it("picks nothing inside the frame, the caption included", () => {
		expect(at(300, 250)).toBeNull();
		expect(at(104, 104)).toBeNull();
		expect(at(495, 395)).toBeNull();
		expect(at(300, 110)).toBeNull();
	});

	it("picks the edge under the pointer on the frame", () => {
		expect(at(300, 101)).toBe("top");
		expect(at(300, 398)).toBe("bottom");
		expect(at(102, 250)).toBe("left");
		expect(at(497, 250)).toBe("right");
	});

	// Wine and ReactOS clamp the pointer to the window's rect first.
	it("picks the edge a pointer outside the window is beside", () => {
		expect(at(300, 20)).toBe("top");
		expect(at(300, 700)).toBe("bottom");
		expect(at(-50, 250)).toBe("left");
		expect(at(900, 250)).toBe("right");
	});

	it("picks a corner from beyond it, or along an edge within the corner's reach", () => {
		expect(at(0, 0)).toBe("top-left");
		expect(at(900, 0)).toBe("top-right");
		expect(at(0, 900)).toBe("bottom-left");
		expect(at(900, 900)).toBe("bottom-right");
		// On the top edge: the corner reaches 4 + 18 px in from each side.
		expect(at(121, 101)).toBe("top-left");
		expect(at(122, 101)).toBe("top");
		expect(at(478, 101)).toBe("top-right");
		expect(at(477, 101)).toBe("top");
		// On a side: the same reach down from the top and up from the bottom.
		expect(at(101, 121)).toBe("top-left");
		expect(at(101, 122)).toBe("left");
		expect(at(498, 378)).toBe("bottom-right");
		expect(at(498, 377)).toBe("right");
	});
});

describe("startClassicyWindowKeyboardMode", () => {
	const stops: (() => void)[] = [];
	const start = () => {
		const handlers = {
			onArrow: vi.fn<ClassicyWindowKeyboardModeHandlers["onArrow"]>(),
			onPointerMove:
				vi.fn<ClassicyWindowKeyboardModeHandlers["onPointerMove"]>(),
			onEnd: vi.fn<ClassicyWindowKeyboardModeHandlers["onEnd"]>(),
		};
		const stop = startClassicyWindowKeyboardMode(handlers);
		if (stop) stops.push(stop);
		return { ...handlers, stop };
	};
	const key = (k: string, target: EventTarget = document.body) => {
		const event = new KeyboardEvent("keydown", {
			key: k,
			bubbles: true,
			cancelable: true,
		});
		target.dispatchEvent(event);
		return event;
	};
	const mouse = (
		type: string,
		init: MouseEventInit = {},
		target: EventTarget = document.body,
	) => {
		const event = new MouseEvent(type, {
			bubbles: true,
			cancelable: true,
			...init,
		});
		target.dispatchEvent(event);
		return event;
	};

	afterEach(() => {
		for (const stop of stops.splice(0)) stop();
	});

	it("reports each arrow, held from everything under it", () => {
		const page = vi.fn();
		document.addEventListener("keydown", page);
		try {
			const mode = start();
			const event = key("ArrowLeft");
			key("ArrowUp");
			expect(mode.onArrow.mock.calls).toEqual([["ArrowLeft"], ["ArrowUp"]]);
			expect(event.defaultPrevented).toBe(true);
			expect(page).not.toHaveBeenCalled();
		} finally {
			document.removeEventListener("keydown", page);
		}
	});

	it("holds every other key, doing nothing with it", () => {
		const page = vi.fn();
		document.body.addEventListener("keydown", page);
		try {
			const mode = start();
			expect(key("a").defaultPrevented).toBe(true);
			expect(key("Tab").defaultPrevented).toBe(true);
			expect(page).not.toHaveBeenCalled();
			expect(mode.onArrow).not.toHaveBeenCalled();
			expect(mode.onEnd).not.toHaveBeenCalled();
		} finally {
			document.body.removeEventListener("keydown", page);
		}
	});

	// Windows' loop eats WM_KEYDOWN but dispatches WM_KEYUP, so a press
	// begun before the mode (Space held on a button) still ends.
	it("lets a key's release reach the page", () => {
		const page = vi.fn();
		document.body.addEventListener("keyup", page);
		try {
			start();
			document.body.dispatchEvent(
				new KeyboardEvent("keyup", { key: " ", bubbles: true }),
			);
			expect(page).toHaveBeenCalledOnce();
		} finally {
			document.body.removeEventListener("keyup", page);
		}
	});

	it("ends committed on ENTER, and the keys reach the page again", () => {
		const page = vi.fn();
		document.addEventListener("keydown", page);
		try {
			const mode = start();
			key("Enter");
			expect(mode.onEnd).toHaveBeenCalledExactlyOnceWith({
				commit: true,
				lost: false,
			});
			expect(page).not.toHaveBeenCalled();
			expect(isClassicyWindowKeyboardModeActive()).toBe(false);
			key("ArrowLeft");
			expect(page).toHaveBeenCalledOnce();
			expect(mode.onArrow).not.toHaveBeenCalled();
		} finally {
			document.removeEventListener("keydown", page);
		}
	});

	it("ends canceled on ESC", () => {
		const mode = start();
		key("Escape");
		expect(mode.onEnd).toHaveBeenCalledExactlyOnceWith({
			commit: false,
			lost: false,
		});
	});

	it("reports the pointer's moves, held from everything under it", () => {
		const page = vi.fn();
		document.body.addEventListener("mousemove", page);
		try {
			const mode = start();
			mouse("mousemove", { clientX: 30, clientY: 40 });
			expect(mode.onPointerMove).toHaveBeenCalledExactlyOnceWith([30, 40]);
			expect(page).not.toHaveBeenCalled();
		} finally {
			document.body.removeEventListener("mousemove", page);
		}
	});

	it("ends committed on a button-1 release, and swallows its click", () => {
		vi.useFakeTimers();
		const page = vi.fn();
		document.body.addEventListener("click", page);
		try {
			const mode = start();
			const down = mouse("mousedown", { button: 0 });
			expect(down.defaultPrevented).toBe(true);
			mouse("mouseup", { button: 0 });
			expect(mode.onEnd).toHaveBeenCalledExactlyOnceWith({
				commit: true,
				lost: false,
			});
			expect(mouse("click").defaultPrevented).toBe(true);
			expect(page).not.toHaveBeenCalled();
			// One click only: the next one is the page's.
			mouse("click");
			expect(page).toHaveBeenCalledOnce();
		} finally {
			document.body.removeEventListener("click", page);
			vi.useRealTimers();
		}
	});

	it("lets the page have the next click when the release brings none", () => {
		vi.useFakeTimers();
		const page = vi.fn();
		document.body.addEventListener("click", page);
		try {
			start();
			mouse("mouseup", { button: 0 });
			vi.runAllTimers();
			mouse("click");
			expect(page).toHaveBeenCalledOnce();
		} finally {
			document.body.removeEventListener("click", page);
			vi.useRealTimers();
		}
	});

	it("holds the other buttons without ending", () => {
		const page = vi.fn();
		document.body.addEventListener("contextmenu", page);
		document.body.addEventListener("mouseup", page);
		try {
			const mode = start();
			mouse("mousedown", { button: 2 });
			mouse("mouseup", { button: 2 });
			expect(mouse("contextmenu", { button: 2 }).defaultPrevented).toBe(true);
			expect(mode.onEnd).not.toHaveBeenCalled();
			expect(page).not.toHaveBeenCalled();
		} finally {
			document.body.removeEventListener("contextmenu", page);
			document.body.removeEventListener("mouseup", page);
		}
	});

	// A touch's compatibility mouse events must still follow, so a tap ends
	// the mode as a click does.
	it("keeps pointer presses from the page without preventing them", () => {
		const page = vi.fn();
		document.body.addEventListener("pointerdown", page);
		try {
			start();
			const down = new Event("pointerdown", {
				bubbles: true,
				cancelable: true,
			});
			document.body.dispatchEvent(down);
			expect(down.defaultPrevented).toBe(false);
			expect(page).not.toHaveBeenCalled();
		} finally {
			document.body.removeEventListener("pointerdown", page);
		}
	});

	it("ends committed and lost when the pointer stream is lost", () => {
		const mode = start();
		window.dispatchEvent(new Event("blur"));
		window.dispatchEvent(new Event("blur"));
		expect(mode.onEnd).toHaveBeenCalledExactlyOnceWith({
			commit: true,
			lost: true,
		});
	});

	it("runs one mode at a time on the page", () => {
		const first = start();
		expect(first.stop).not.toBeNull();
		expect(isClassicyWindowKeyboardModeActive()).toBe(true);
		const second = start();
		expect(second.stop).toBeNull();
		key("ArrowDown");
		expect(first.onArrow).toHaveBeenCalledOnce();
		expect(second.onArrow).not.toHaveBeenCalled();
		// Stopped by its owner: no end reported, and another may start.
		first.stop?.();
		expect(first.onEnd).not.toHaveBeenCalled();
		expect(isClassicyWindowKeyboardModeActive()).toBe(false);
		const third = start();
		expect(third.stop).not.toBeNull();
		key("ArrowDown");
		expect(third.onArrow).toHaveBeenCalledOnce();
		expect(first.onArrow).toHaveBeenCalledOnce();
	});
});
