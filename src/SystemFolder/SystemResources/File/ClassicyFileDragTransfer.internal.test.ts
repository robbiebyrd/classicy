import { afterEach, describe, expect, it, vi } from "vitest";
import { CLASSICY_DEFAULT_APPEARANCE_LAYOUT } from "@/Appearance/ClassicyAppearanceDefaults";
import type { ClassicyAppearanceLayout } from "@/Appearance/ClassicyAppearancePackage";
import {
	CLASSICY_FILE_DRAG_CONTEXT_MENU_WAIT_MS,
	CLASSICY_FILE_DROP_FEEDBACK_ATTRIBUTE,
	classicyFileDragFeedbackRoot,
	classicyFileDragPressCtrlOnMac,
	classicyFileDragRequestedEffect,
	classicyFileDropDestinationEffects,
	classicyFileDropEffectFor,
	setClassicyFileDropFeedback,
	swallowClassicyFileDragContextMenu,
} from "@/SystemFolder/SystemResources/File/ClassicyFileDragTransfer.internal";

// The drag transfer rules of the remaining chapters' audit's 5.33 (the
// Trash's menu 201), 5.34 / A.8 (WIG Ch.5 "Shortcut Keys for Transfer
// Operations", pp.67-68; App. A Table A.3 notes 2-3) and 4.6 / 5.32 (the
// `data-classicy-drop` attribute).

const WINDOWS: ClassicyAppearanceLayout = {
	...CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
	transfer: { copyModifier: "ctrl" },
};
const keys = (ctrlKey: boolean, shiftKey: boolean) => ({ ctrlKey, shiftKey });

describe("classicyFileDropDestinationEffects", () => {
	it("takes a move alone into the Trash, every effect anywhere else", () => {
		expect(
			classicyFileDropDestinationEffects({ kind: "folder", path: "Trash" }),
		).toEqual(["move"]);
		expect(
			classicyFileDropDestinationEffects({ kind: "folder", path: "HD:Docs" }),
		).toEqual(["move", "copy", "link"]);
		expect(classicyFileDropDestinationEffects({ kind: "desktop" })).toEqual([
			"move",
			"copy",
			"link",
		]);
	});
});

describe("classicyFileDragRequestedEffect", () => {
	it("copies with Control, makes shortcuts with Control and Shift, else moves, under the key", () => {
		expect(
			classicyFileDragRequestedEffect(WINDOWS, keys(false, false), false),
		).toBe("move");
		expect(
			classicyFileDragRequestedEffect(WINDOWS, keys(true, false), false),
		).toBe("copy");
		expect(
			classicyFileDragRequestedEffect(WINDOWS, keys(true, true), false),
		).toBe("link");
		// Shift alone forces the default, a move.
		expect(
			classicyFileDragRequestedEffect(WINDOWS, keys(false, true), false),
		).toBe("move");
	});

	it("moves throughout a press that began with Control on a Mac host", () => {
		expect(
			classicyFileDragRequestedEffect(WINDOWS, keys(true, false), true),
		).toBe("move");
		expect(
			classicyFileDragRequestedEffect(WINDOWS, keys(true, true), true),
		).toBe("move");
	});

	it("always moves without the key, as Mac OS 8's Finder does", () => {
		for (const k of [keys(true, false), keys(true, true)]) {
			expect(
				classicyFileDragRequestedEffect(
					CLASSICY_DEFAULT_APPEARANCE_LAYOUT,
					k,
					false,
				),
			).toBe("move");
		}
	});
});

describe("classicyFileDropEffectFor", () => {
	it("takes the effect asked for when taken, else a move, else the first taken", () => {
		expect(classicyFileDropEffectFor("copy", ["move", "copy", "link"])).toBe(
			"copy",
		);
		expect(classicyFileDropEffectFor("copy", ["move"])).toBe("move");
		expect(classicyFileDropEffectFor("link", ["move", "copy"])).toBe("move");
		expect(classicyFileDropEffectFor("move", ["link"])).toBe("link");
		expect(classicyFileDropEffectFor("copy", [])).toBe("move");
	});
});

describe("classicyFileDragPressCtrlOnMac", () => {
	afterEach(() => vi.restoreAllMocks());

	it("is a Control press on a Mac host only", () => {
		const platform = vi.spyOn(navigator, "platform", "get");
		platform.mockReturnValue("MacIntel");
		expect(classicyFileDragPressCtrlOnMac(true)).toBe(true);
		expect(classicyFileDragPressCtrlOnMac(false)).toBe(false);
		expect(classicyFileDragPressCtrlOnMac(undefined)).toBe(false);
		platform.mockReturnValue("Win32");
		expect(classicyFileDragPressCtrlOnMac(true)).toBe(false);
	});
});

describe("the drop feedback attribute", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("goes on the desktop around the source, else the page's desktop", () => {
		document.body.innerHTML = `<div id="classicyDesktop" class="classicyDesktop"></div><div class="classicyDesktop" id="other"><span id="icon"></span></div>`;
		const page = document.getElementById("classicyDesktop");
		const other = document.getElementById("other");
		expect(classicyFileDragFeedbackRoot(document.getElementById("icon"))).toBe(
			other,
		);
		expect(classicyFileDragFeedbackRoot(null)).toBe(page);
		document.body.innerHTML = "";
		expect(classicyFileDragFeedbackRoot(null)).toBeNull();
	});

	it("is set to a value and removed by null", () => {
		document.body.innerHTML = `<div class="classicyDesktop"></div>`;
		const root = classicyFileDragFeedbackRoot(null);
		setClassicyFileDropFeedback(root, "none");
		expect(root?.getAttribute(CLASSICY_FILE_DROP_FEEDBACK_ATTRIBUTE)).toBe(
			"none",
		);
		setClassicyFileDropFeedback(root, "copy");
		expect(root?.getAttribute("data-classicy-drop")).toBe("copy");
		setClassicyFileDropFeedback(root, null);
		expect(root?.hasAttribute("data-classicy-drop")).toBe(false);
		// No root, nothing to do.
		expect(() => setClassicyFileDropFeedback(null, "none")).not.toThrow();
	});
});

describe("swallowClassicyFileDragContextMenu", () => {
	afterEach(() => vi.useRealTimers());

	const contextMenu = () => {
		const event = new MouseEvent("contextmenu", {
			bubbles: true,
			cancelable: true,
		});
		const heard = vi.fn();
		document.body.addEventListener("contextmenu", heard);
		document.body.dispatchEvent(event);
		document.body.removeEventListener("contextmenu", heard);
		return {
			prevented: event.defaultPrevented,
			heard: heard.mock.calls.length,
		};
	};

	it("swallows the next contextmenu, and only that one", () => {
		swallowClassicyFileDragContextMenu();
		expect(contextMenu()).toEqual({ prevented: true, heard: 0 });
		expect(contextMenu()).toEqual({ prevented: false, heard: 1 });
	});

	it("lets the next press, key or the wait end it", () => {
		vi.useFakeTimers();
		swallowClassicyFileDragContextMenu();
		document.dispatchEvent(new MouseEvent("mousedown", { bubbles: true }));
		expect(contextMenu()).toEqual({ prevented: false, heard: 1 });
		swallowClassicyFileDragContextMenu();
		document.dispatchEvent(new KeyboardEvent("keydown", { key: "F10" }));
		expect(contextMenu()).toEqual({ prevented: false, heard: 1 });
		swallowClassicyFileDragContextMenu();
		vi.advanceTimersByTime(CLASSICY_FILE_DRAG_CONTEXT_MENU_WAIT_MS);
		expect(contextMenu()).toEqual({ prevented: false, heard: 1 });
	});
});
