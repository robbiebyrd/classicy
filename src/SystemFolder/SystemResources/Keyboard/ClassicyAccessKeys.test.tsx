import { afterEach, describe, expect, it, vi } from "vitest";
import { render, renderHook } from "@/__tests__/test-utils";
import { activateTestWindowsKeysPackage } from "@/__tests__/testWindowsKeysPackage";
import {
	classicyAccessKeyFromEvent,
	classicyAccessKeyIndex,
	classicyAutoAccessKeyIndex,
	classicyFocusedAccessKeyScope,
	classicyMenuBarClaimsAccessKey,
	classicyNodeText,
	isClassicyMenuKeyTarget,
	isClassicyMenuShown,
	isClassicyTextEntry,
	markClassicyMenuShown,
	normalizeClassicyAccessKey,
	registerClassicyAccessKeyMenuBar,
	renderClassicyAccessKeyNode,
	renderClassicyAccessKeyText,
	resetClassicyAccessKeyReportsForTests,
	resolveClassicyAccessKeys,
	useClassicyBundledAccessKeys,
	warnClassicyDuplicateAccessKeys,
} from "@/SystemFolder/SystemResources/Keyboard/ClassicyAccessKeys.internal";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// The access keys of the WIG audit's 7.1 and 8.9 (WIG Ch.4 "Access Keys",
// p.27; Ch.7 "Menu Titles", p.106, "Menu Item Labels", p.109).

const keysOf = (
	titles: (string | [string, string])[],
	mode: "explicit" | "auto" | undefined,
) =>
	resolveClassicyAccessKeys(
		titles.map((t) =>
			typeof t === "string" ? { text: t } : { text: t[0], accessKey: t[1] },
		),
		mode,
	).map((k) => (k ? `${k.key}@${k.index}` : null));

describe("classicyAccessKeyIndex", () => {
	it("finds the key in its own case first, else case-insensitively", () => {
		expect(classicyAccessKeyIndex("Favorites", "a")).toBe(1);
		expect(classicyAccessKeyIndex("Save As", "A")).toBe(5);
		expect(classicyAccessKeyIndex("Save As", "a")).toBe(1);
		expect(classicyAccessKeyIndex("Shut Down...", "u")).toBe(2);
		expect(classicyAccessKeyIndex("File", "f")).toBe(0);
		expect(classicyAccessKeyIndex("File", "z")).toBe(-1);
		expect(classicyAccessKeyIndex("File", "")).toBe(-1);
	});
});

describe("normalizeClassicyAccessKey", () => {
	it("keeps one character, lower-cased; an empty string is an explicit none", () => {
		expect(normalizeClassicyAccessKey("F")).toBe("f");
		expect(normalizeClassicyAccessKey("Fx")).toBe("f");
		expect(normalizeClassicyAccessKey("")).toBe("");
		expect(normalizeClassicyAccessKey(undefined)).toBeUndefined();
	});
});

describe("classicyAutoAccessKeyIndex", () => {
	it("takes the first letter, then a later word's first letter, then a consonant, then a vowel", () => {
		expect(classicyAutoAccessKeyIndex("Save", new Set())).toBe(0);
		// S taken: the next word's first letter.
		expect(classicyAutoAccessKeyIndex("Save As", new Set(["s"]))).toBe(5);
		// S and A taken: a consonant (v), not the vowel e.
		expect(classicyAutoAccessKeyIndex("Save As", new Set(["s", "a"]))).toBe(2);
		// Every consonant taken: a vowel.
		expect(classicyAutoAccessKeyIndex("Save", new Set(["s", "v", "a"]))).toBe(
			3,
		);
		expect(
			classicyAutoAccessKeyIndex("Save", new Set(["s", "a", "v", "e"])),
		).toBe(-1);
	});

	it("skips punctuation and spaces, and takes digits", () => {
		expect(classicyAutoAccessKeyIndex("…Open", new Set())).toBe(1);
		expect(classicyAutoAccessKeyIndex("1 Report.txt", new Set())).toBe(0);
		expect(classicyAutoAccessKeyIndex("(Empty)", new Set(["e"]))).toBe(2);
	});
});

describe("resolveClassicyAccessKeys", () => {
	// A package that declares no `layout.menu.accessKeys` (Platinum, System
	// 7: Mac OS had no access keys) gives none, an explicit one included.
	it("gives none, an explicit key included, with no mode declared", () => {
		expect(keysOf(["File", ["Edit", "E"], "View"], undefined)).toEqual([
			null,
			null,
			null,
		]);
	});

	it("gives only explicit keys under explicit, none to the rest", () => {
		expect(keysOf(["File", ["Edit", "E"], "View"], "explicit")).toEqual([
			null,
			"e@0",
			null,
		]);
	});

	it("gives every titled sibling a free character under auto, in order", () => {
		expect(
			keysOf(["New", "Open", "Close", "Save", "Save As", "Quit"], "auto"),
		).toEqual(["n@0", "o@0", "c@0", "s@0", "a@5", "q@0"]);
		// Nothing left: no key.
		expect(keysOf(["A", "a", ""], "auto")).toEqual(["a@0", null, null]);
	});

	// Windows 98's Start menu gives Favorites "a" and Find "F"
	// (lolstring-borrow-report §2.2): the automatic pick would give Favorites
	// "F" and Find "i", so the explicit keys must win and be reserved first.
	it("reserves explicit keys before any automatic pick, which never takes one", () => {
		expect(keysOf(["Favorites", ["Find", "F"]], "auto")).toEqual([
			"v@2",
			"f@0",
		]);
		expect(
			keysOf(
				[
					["Programs", "P"],
					["Favorites", "a"],
					["Documents", "D"],
					["Settings", "S"],
					["Find", "F"],
					["Help", "H"],
					["Run...", "R"],
					["Log Off...", "L"],
					["Shut Down...", "u"],
					"Windows Update",
				],
				"auto",
			),
		).toEqual([
			"p@0",
			"a@1",
			"d@0",
			"s@0",
			"f@0",
			"h@0",
			"r@0",
			"l@0",
			"u@2",
			"w@0",
		]);
	});

	it("lets explicit siblings share a key, and an empty key opt an item out", () => {
		expect(
			keysOf(
				[
					["Cut", "t"],
					["Tab", "t"],
					["Copy", ""],
				],
				"auto",
			),
		).toEqual(["t@2", "t@0", null]);
	});
});

describe("renderClassicyAccessKeyText", () => {
	it("wraps the character in the access-key part, inside one span that keeps the spaces", () => {
		const { container } = render(
			<p>{renderClassicyAccessKeyText("Save As", { key: "a", index: 5 })}</p>,
		);
		const part = container.querySelector('[data-classicy-part="access-key"]');
		expect(part).toHaveTextContent("A");
		expect(part?.parentElement?.tagName).toBe("SPAN");
		expect(part?.parentElement?.parentElement?.tagName).toBe("P");
		expect(container.querySelector("p")).toHaveTextContent("Save As", {
			normalizeWhitespace: false,
		});
	});

	it("leaves the text alone with no key, or one the text lacks", () => {
		expect(renderClassicyAccessKeyText("File", null)).toBe("File");
		expect(renderClassicyAccessKeyText("File", { key: "z", index: -1 })).toBe(
			"File",
		);
	});
});

describe("renderClassicyAccessKeyNode / classicyNodeText", () => {
	const rich = (
		<>
			Name of <em>new</em> folder:
		</>
	);

	it("reads a rich label's text through its elements", () => {
		expect(classicyNodeText(rich)).toBe("Name of new folder:");
		expect(classicyNodeText(["a", 1, null, false])).toBe("a1");
	});

	it("underlines inside the element that holds the character", () => {
		const { container } = render(
			<p>{renderClassicyAccessKeyNode(rich, { key: "n", index: 8 })}</p>,
		);
		const part = container.querySelector('[data-classicy-part="access-key"]');
		expect(part).toHaveTextContent("n");
		expect(part?.closest("em")).not.toBeNull();
		expect(container.querySelector("p")).toHaveTextContent(
			"Name of new folder:",
		);
		expect(
			container.querySelectorAll('[data-classicy-part="access-key"]'),
		).toHaveLength(1);
	});

	it("leaves the node alone with no key", () => {
		expect(renderClassicyAccessKeyNode(rich, null)).toBe(rich);
	});
});

describe("classicyAccessKeyFromEvent", () => {
	it("reads the key itself, a letter or digit, lower-cased", () => {
		expect(classicyAccessKeyFromEvent({ key: "F" }, { mac: false })).toBe("f");
		expect(classicyAccessKeyFromEvent({ key: "1" }, { mac: false })).toBe("1");
		expect(classicyAccessKeyFromEvent({ key: "-" }, { mac: false })).toBeNull();
		expect(
			classicyAccessKeyFromEvent({ key: "Enter" }, { mac: false }),
		).toBeNull();
	});

	it("reads the physical key under Option on a Mac, where Option composes", () => {
		expect(
			classicyAccessKeyFromEvent(
				{ key: "ƒ", code: "KeyF", altKey: true },
				{ mac: true },
			),
		).toBe("f");
		expect(
			classicyAccessKeyFromEvent(
				{ key: "f", code: "KeyF", altKey: true },
				{ mac: false },
			),
		).toBe("f");
		expect(
			classicyAccessKeyFromEvent(
				{ key: "Dead", code: "KeyE", altKey: true },
				{ mac: false },
			),
		).toBe("e");
	});
});

describe("isClassicyTextEntry", () => {
	it("is a text field, a text area or editable content, never a check box", () => {
		const text = document.createElement("input");
		const box = document.createElement("input");
		box.type = "checkbox";
		const area = document.createElement("textarea");
		const button = document.createElement("button");
		expect(isClassicyTextEntry(text)).toBe(true);
		expect(isClassicyTextEntry(area)).toBe(true);
		expect(isClassicyTextEntry(box)).toBe(false);
		expect(isClassicyTextEntry(button)).toBe(false);
		expect(isClassicyTextEntry(null)).toBe(false);
	});
});

describe("classicyFocusedAccessKeyScope", () => {
	it("is the focused element's window, else the front modal, else the front active window, else the document", () => {
		const windowAt = (z: number) => {
			const win = document.createElement("div");
			win.className = "classicyWindow active";
			win.style.zIndex = String(z);
			win.append(document.createElement("button"));
			document.body.append(win);
			return win;
		};
		const back = windowAt(5);
		const front = windowAt(9);
		(back.querySelector("button") as HTMLElement).focus();
		expect(classicyFocusedAccessKeyScope(document)).toBe(back);
		(document.activeElement as HTMLElement).blur();
		expect(classicyFocusedAccessKeyScope(document)).toBe(front);
		back.classList.add("classicyWindowModal");
		expect(classicyFocusedAccessKeyScope(document)).toBe(back);
		back.remove();
		front.remove();
		expect(classicyFocusedAccessKeyScope(document)).toBe(
			document.documentElement,
		);
	});
});

describe("the menu bars' claims", () => {
	it("answers from every registered bar, and forgets a removed one", () => {
		const remove = registerClassicyAccessKeyMenuBar({
			claims: (key) => key === "f",
		});
		expect(classicyMenuBarClaimsAccessKey("f")).toBe(true);
		expect(classicyMenuBarClaimsAccessKey("e")).toBe(false);
		remove();
		expect(classicyMenuBarClaimsAccessKey("f")).toBe(false);
	});
});

// The remaining chapters' audit's 4.14: while a menu on Windows' keyboard is
// shown, or focus is in a menu, Alt and a key are the menu's.
describe("the menus that take the keys typed", () => {
	it("counts each shown menu once, and forgets a removed one", () => {
		expect(isClassicyMenuShown()).toBe(false);
		const a = markClassicyMenuShown();
		const b = markClassicyMenuShown();
		expect(isClassicyMenuShown()).toBe(true);
		a();
		a();
		expect(isClassicyMenuShown()).toBe(true);
		b();
		expect(isClassicyMenuShown()).toBe(false);
	});

	it("knows a target in a bar's title or an open menu", () => {
		const { container } = render(
			<>
				<ul>
					<li className="classicyMenuItem">
						<span data-testid="title">File</span>
					</li>
				</ul>
				<div className="classicyMenuWrapper">
					<button type="button">item</button>
				</div>
				<button type="button">outside</button>
			</>,
		);
		const [item, outside] = Array.from(container.querySelectorAll("button"));
		expect(isClassicyMenuKeyTarget(container.querySelector("span"))).toBe(true);
		expect(isClassicyMenuKeyTarget(item)).toBe(true);
		expect(isClassicyMenuKeyTarget(outside)).toBe(false);
		expect(isClassicyMenuKeyTarget(null)).toBe(false);
	});
});

// The remaining chapters' audit's 4.12 (WIG Appendix B Table B.5, p.360):
// the bundled menus' and buttons' keys, given only under a package with
// access keys, so Platinum and System 7 carry none.
describe("useClassicyBundledAccessKeys", () => {
	let restore: (() => void) | undefined;
	afterEach(() => {
		restore?.();
		restore = undefined;
	});

	it("gives no key by default (Platinum)", () => {
		const { result } = renderHook(() => useClassicyBundledAccessKeys());
		expect(result.current("f")).toBeUndefined();
		expect(result.current("")).toBeUndefined();
	});

	it("gives the key, an empty one included, under a package's layout.menu.accessKeys, and keeps its identity", () => {
		restore = activateTestWindowsKeysPackage({
			menu: { keys: "windows", accessKeys: "explicit" },
		});
		const { result, rerender } = renderHook(() =>
			useClassicyBundledAccessKeys(),
		);
		const first = result.current;
		expect(first("f")).toBe("f");
		expect(first("")).toBe("");
		rerender();
		expect(result.current).toBe(first);
	});
});

// WIG Ch.4 "Access Keys" (p.27): unique within its scope.
describe("warnClassicyDuplicateAccessKeys", () => {
	const entries: ClassicyLogEntry[] = [];
	afterEach(() => {
		unregisterClassicyLogSink("duplicate-keys");
		entries.length = 0;
		resetClassicyAccessKeyReportsForTests();
		vi.unstubAllEnvs();
	});
	const listen = () =>
		registerClassicyLogSink({
			id: "duplicate-keys",
			onLog: (entry) => entries.push(entry),
		});

	it("logs a set sharing a key once, as a Menu or a Dialog warning", () => {
		listen();
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const set = [
			{ text: "Copy", key: "c" },
			{ text: "Close", key: "c" },
			{ text: "Paste", key: "p" },
			{ text: "Clear", key: null },
		];
		warnClassicyDuplicateAccessKeys("Menu", set);
		warnClassicyDuplicateAccessKeys("Menu", set);
		expect(entries).toHaveLength(1);
		expect(entries[0]).toMatchObject({ level: "warn", subsystem: "Menu" });
		expect(entries[0].message).toContain("“Copy”, “Close”");
		expect(entries[0].message).toContain('"c"');
		warnClassicyDuplicateAccessKeys("Dialog", [
			{ text: "Yes", key: "y" },
			{ text: "Yesterday", key: "y" },
		]);
		expect(entries[1]).toMatchObject({ subsystem: "Dialog" });
		expect(entries[1].message).toContain("one window's controls");
		warn.mockRestore();
	});

	it("logs nothing for unique keys, or in a production build", () => {
		listen();
		warnClassicyDuplicateAccessKeys("Menu", [
			{ text: "Copy", key: "c" },
			{ text: "Paste", key: "p" },
		]);
		vi.stubEnv("NODE_ENV", "production");
		warnClassicyDuplicateAccessKeys("Menu", [
			{ text: "Copy", key: "c" },
			{ text: "Close", key: "c" },
		]);
		expect(entries).toHaveLength(0);
	});
});
