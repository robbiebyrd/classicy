import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import {
	classicyFileClipboardKey,
	clearClassicyFileClipboard,
	getClassicyFileClipboard,
	isClassicyFileCut,
	setClassicyFileClipboard,
	subscribeClassicyFileClipboard,
	useClassicyFileClipboard,
	useClassicyFileCut,
	useClassicyFileCutPaths,
} from "@/SystemFolder/SystemResources/File/ClassicyFileClipboard";

// The file clipboard (the remaining chapters' audit's 5.28; WIG Ch.5
// "Command Method", pp.59-61, "Command Method Transfers", p.66): what
// Explorer's Cut and Copy hold, apart from the system clipboard, until a
// Paste, another Cut or Copy, or Escape.

afterEach(() => {
	cleanup();
	clearClassicyFileClipboard();
	document.body.innerHTML = "";
});

const escapeOn = (target: EventTarget, init: KeyboardEventInit = {}) => {
	const event = new KeyboardEvent("keydown", {
		key: "Escape",
		bubbles: true,
		cancelable: true,
		...init,
	});
	act(() => {
		target.dispatchEvent(event);
	});
	return event;
};

describe("the file clipboard", () => {
	it("holds a Cut or a Copy, replacing what it held, without repeats; no paths empties it", () => {
		expect(getClassicyFileClipboard()).toBeNull();
		setClassicyFileClipboard("cut", ["a", "b", "a"]);
		expect(getClassicyFileClipboard()).toEqual({
			op: "cut",
			paths: ["a", "b"],
			storageKey: "classicyStorage",
		});
		expect(Object.isFrozen(getClassicyFileClipboard())).toBe(true);
		setClassicyFileClipboard("copy", ["c"], "other");
		expect(getClassicyFileClipboard()).toEqual({
			op: "copy",
			paths: ["c"],
			storageKey: "other",
		});
		setClassicyFileClipboard("copy", []);
		expect(getClassicyFileClipboard()).toBeNull();
	});

	it("tells subscribers of each change, and nothing when cleared while empty", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyFileClipboard(listener);
		setClassicyFileClipboard("copy", ["a"]);
		clearClassicyFileClipboard();
		clearClassicyFileClipboard();
		expect(listener).toHaveBeenCalledTimes(2);
		unsubscribe();
		setClassicyFileClipboard("copy", ["a"]);
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("says which items are cut, in their tree only", () => {
		setClassicyFileClipboard("cut", ["a"]);
		expect(isClassicyFileCut("a")).toBe(true);
		expect(isClassicyFileCut("b")).toBe(false);
		expect(isClassicyFileCut("a", "other")).toBe(false);
		setClassicyFileClipboard("copy", ["a"]);
		expect(isClassicyFileCut("a")).toBe(false);
	});

	it("gives components the clipboard and the cut items, live", () => {
		const seen: unknown[] = [];
		const Probe = ({ path }: { path?: string }) => {
			const clipboard = useClassicyFileClipboard();
			const cutPaths = useClassicyFileCutPaths();
			const cut = useClassicyFileCut(path);
			seen.push([clipboard?.op ?? null, [...cutPaths], cut]);
			return null;
		};
		render(<Probe path="a" />);
		act(() => setClassicyFileClipboard("cut", ["a", "b"]));
		act(() => setClassicyFileClipboard("copy", ["a"]));
		act(() => clearClassicyFileClipboard());
		expect(seen).toEqual([
			[null, [], false],
			["cut", ["a", "b"], true],
			["copy", [], false],
			[null, [], false],
		]);
		render(<Probe />);
		act(() => setClassicyFileClipboard("cut", ["a"]));
		expect(seen.at(-1)).toEqual(["cut", ["a"], false]);
	});

	describe("Escape after a Cut", () => {
		it("empties it, pressed in a folder view, on a desktop icon, on the desktop or the page", () => {
			const view = document.createElement("div");
			view.className = "classicyFileBrowserFill";
			const icon = document.createElement("div");
			view.append(icon);
			const desktopIcon = document.createElement("div");
			desktopIcon.className = "classicyDesktopIcon";
			const desktop = document.createElement("div");
			desktop.id = "classicyDesktop";
			document.body.append(view, desktopIcon, desktop);
			for (const target of [icon, desktopIcon, desktop, document.body]) {
				setClassicyFileClipboard("cut", ["a"]);
				escapeOn(target);
				expect(getClassicyFileClipboard()).toBeNull();
			}
		});

		it("leaves it in a text field, elsewhere, with a modifier, or once taken", () => {
			const view = document.createElement("div");
			view.className = "classicyFileBrowserFill";
			const field = document.createElement("input");
			view.append(field);
			const elsewhere = document.createElement("div");
			const taken = document.createElement("div");
			taken.className = "classicyDesktopIcon";
			taken.addEventListener("keydown", (e) => e.preventDefault());
			document.body.append(view, elsewhere, taken);
			setClassicyFileClipboard("cut", ["a"]);
			escapeOn(field);
			escapeOn(elsewhere);
			escapeOn(document.body, { shiftKey: true });
			escapeOn(taken);
			expect(getClassicyFileClipboard()?.op).toBe("cut");
		});

		it("leaves a Copy", () => {
			setClassicyFileClipboard("copy", ["a"]);
			escapeOn(document.body);
			expect(getClassicyFileClipboard()?.op).toBe("copy");
		});
	});

	it("gives way to text cut or copied (one clipboard, as Windows keeps it)", () => {
		for (const type of ["copy", "cut"]) {
			setClassicyFileClipboard("copy", ["a"]);
			act(() => {
				document.dispatchEvent(new Event(type, { bubbles: true }));
			});
			expect(getClassicyFileClipboard(), type).toBeNull();
		}
	});
});

describe("classicyFileClipboardKey", () => {
	const key = (init: KeyboardEventInit) => new KeyboardEvent("keydown", init);

	it("reads Ctrl+X, Ctrl+C and Ctrl+V, and nothing else", () => {
		expect(classicyFileClipboardKey(key({ key: "x", ctrlKey: true }))).toBe(
			"cut",
		);
		expect(classicyFileClipboardKey(key({ key: "c", ctrlKey: true }))).toBe(
			"copy",
		);
		expect(classicyFileClipboardKey(key({ key: "v", ctrlKey: true }))).toBe(
			"paste",
		);
		expect(classicyFileClipboardKey(key({ key: "v" }))).toBeUndefined();
		expect(
			classicyFileClipboardKey(
				key({ key: "v", ctrlKey: true, shiftKey: true }),
			),
		).toBeUndefined();
		expect(
			classicyFileClipboardKey(key({ key: "a", ctrlKey: true })),
		).toBeUndefined();
	});

	it("matches Command as the package does: ⌘ or Ctrl on Mac OS, Ctrl alone on Windows", () => {
		expect(classicyFileClipboardKey(key({ key: "c", metaKey: true }))).toBe(
			"copy",
		);
		const restore = activateTestWindowsKeysPackage({
			keyboard: { command: "ctrl" },
		});
		try {
			expect(
				classicyFileClipboardKey(key({ key: "c", metaKey: true })),
			).toBeUndefined();
			expect(classicyFileClipboardKey(key({ key: "c", ctrlKey: true }))).toBe(
				"copy",
			);
		} finally {
			restore();
		}
	});
});
