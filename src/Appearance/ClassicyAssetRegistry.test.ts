import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyAssetTree,
	classicyAssetVarName,
	registerClassicyAssets,
	registerClassicyCursors,
	registerClassicySystemArt,
	registerClassicyWallpapers,
	resetClassicyAssets,
	resolveClassicyAsset,
	subscribeClassicyAssets,
	useClassicyAsset,
	useClassicyAssetTree,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import { isClassicyAssetSource } from "@/Appearance/ClassicyAssetSource";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const captureHook = <T>(hook: () => T) => {
	const seen: T[] = [];
	const Probe = () => {
		seen.push(hook());
		return null;
	};
	render(createElement(Probe));
	return seen;
};

describe("ClassicyAssetRegistry", () => {
	beforeEach(() => {
		resetClassicyAssets();
	});

	it("resolves a dotted path in the platinum tree", () => {
		registerClassicyAssets("icons", "platinum", { system: { apple: "a.png" } });
		expect(resolveClassicyAsset("icons", "system.apple")).toBe("a.png");
		expect(resolveClassicyAsset("icons", "system")).toBeUndefined();
		expect(resolveClassicyAsset("icons", "system.missing")).toBeUndefined();
	});

	it("deep-merges instead of replacing a namespace (audit §4.1)", () => {
		registerClassicyAssets("icons", "platinum", {
			system: { apple: "a", help: "h", files: { file: "f", document: "d" } },
		});
		registerClassicyAssets("icons", "platinum", { system: { alias: "x" } });
		expect(resolveClassicyAsset("icons", "system.apple")).toBe("a");
		expect(resolveClassicyAsset("icons", "system.files.document")).toBe("d");
		expect(resolveClassicyAsset("icons", "system.alias")).toBe("x");
		const seen = captureHook(() => useClassicyAssetTree("icons"));
		const tree = seen[0] as { system: ClassicyAssetTree };
		expect(Object.keys(tree.system)).toHaveLength(4);
	});

	it("a later registration of the same leaf replaces it", () => {
		registerClassicyAssets("icons", "platinum", { system: { alias: "x" } });
		registerClassicyAssets("icons", "platinum", { system: { alias: "y" } });
		expect(resolveClassicyAsset("icons", "system.alias")).toBe("y");
	});

	it("falls back from the active package to platinum, then undefined", () => {
		registerClassicyAssets("icons", "platinum", { a: "p" });
		registerClassicyAssets("icons", "other", { b: "o" });
		expect(resolveClassicyAsset("icons", "a", "other")).toBe("p");
		expect(resolveClassicyAsset("icons", "b", "other")).toBe("o");
		expect(resolveClassicyAsset("icons", "b")).toBeUndefined();
	});

	it("notifies subscribers once per registration", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyAssets(listener);
		registerClassicyAssets("icons", "platinum", { a: "p" });
		expect(listener).toHaveBeenCalledTimes(1);
		unsubscribe();
		registerClassicyAssets("icons", "platinum", { a: "q" });
		expect(listener).toHaveBeenCalledTimes(1);
	});

	it("useClassicyAsset re-renders when its path is re-registered after mount", () => {
		const Probe = () => {
			const src = useClassicyAsset("systemArt", "appleMenu");
			return createElement("span", { "data-testid": "probe" }, src ?? "");
		};
		const { getByTestId } = render(createElement(Probe));
		expect(getByTestId("probe").textContent).toBe("");
		act(() =>
			registerClassicySystemArt("platinum", { appleMenu: "apple.png" }),
		);
		expect(getByTestId("probe").textContent).toBe("apple.png");
	});

	it("useClassicyAssetTree returns a stable merged copy until the version changes", () => {
		registerClassicyAssets("icons", "platinum", { a: "p" });
		const first = captureHook(() => useClassicyAssetTree("icons"))[0];
		const second = captureHook(() => useClassicyAssetTree("icons"))[0];
		expect(second).toBe(first);
		act(() => registerClassicyAssets("icons", "platinum", { b: "q" }));
		const third = captureHook(() => useClassicyAssetTree("icons"))[0];
		expect(third).not.toBe(first);
		(third as ClassicyAssetTree).a = "mutated";
		expect(resolveClassicyAsset("icons", "a")).toBe("p");
	});

	it("useClassicyAssetVars emits kebab-cased url() variables for cursors and system art", () => {
		registerClassicyCursors("platinum", {
			resizeLr: "lr.png",
			arrow: "arrow.svg",
		});
		registerClassicySystemArt("platinum", { windowStripesRed: "red.svg" });
		const vars = captureHook(() => useClassicyAssetVars())[0];
		expect(vars).toEqual({
			"--classicy-cursor-resize-lr": 'url("lr.png")',
			"--classicy-cursor-arrow": 'url("arrow.svg")',
			"--classicy-art-window-stripes-red": 'url("red.svg")',
		});
	});

	it("registerClassicyWallpapers keys the tree by name", () => {
		registerClassicyWallpapers("platinum", [
			{ name: "Azul Dark", src: "azul_dark.png" },
		]);
		expect(resolveClassicyAsset("wallpapers", "Azul Dark")).toBe(
			"azul_dark.png",
		);
	});

	it("classicyAssetVarName", () => {
		expect(classicyAssetVarName("cursors", "resizeNwse")).toBe(
			"--classicy-cursor-resize-nwse",
		);
		expect(classicyAssetVarName("systemArt", "sadMac")).toBe(
			"--classicy-art-sad-mac",
		);
	});

	it("isClassicyAssetSource accepts URLs and data URIs, refuses other schemes", () => {
		expect(isClassicyAssetSource("a.png")).toBe(true);
		expect(isClassicyAssetSource("https://x.test/a.png")).toBe(true);
		expect(isClassicyAssetSource("data:image/svg+xml,<svg a='1'/>")).toBe(true);
		expect(isClassicyAssetSource("javascript:alert(1)")).toBe(false);
		expect(isClassicyAssetSource('a").png')).toBe(false);
		expect(isClassicyAssetSource("")).toBe(false);
	});

	describe("source validation", () => {
		const entries: ClassicyLogEntry[] = [];

		beforeEach(() => {
			entries.length = 0;
			vi.spyOn(console, "warn").mockImplementation(() => {});
			registerClassicyLogSink({
				id: "asset-validation-test",
				onLog: (entry) => entries.push(entry),
			});
		});

		afterEach(() => {
			unregisterClassicyLogSink("asset-validation-test");
			vi.restoreAllMocks();
		});

		it.each([
			['a").png', "close-paren and quote"],
			['a"b.png', "quote"],
			["javascript:alert(1)", "javascript: scheme"],
			["", "empty string"],
		])("skips a cursor and a system-art source %j (%s), keeps valid siblings, and never emits a variable for it", (bad) => {
			registerClassicyCursors("platinum", {
				hand: bad,
				arrow: "arrow.svg",
			});
			registerClassicySystemArt("platinum", {
				aliasBadge: bad,
				sadMac: "sad.png",
			});
			expect(resolveClassicyAsset("cursors", "hand")).toBeUndefined();
			expect(resolveClassicyAsset("systemArt", "aliasBadge")).toBeUndefined();
			expect(resolveClassicyAsset("cursors", "arrow")).toBe("arrow.svg");
			expect(resolveClassicyAsset("systemArt", "sadMac")).toBe("sad.png");
			const vars = captureHook(() => useClassicyAssetVars())[0];
			expect(vars).toEqual({
				"--classicy-cursor-arrow": 'url("arrow.svg")',
				"--classicy-art-sad-mac": 'url("sad.png")',
			});
			const warnings = entries.filter((e) => e.level === "warn");
			expect(warnings.map((e) => e.message)).toEqual([
				expect.stringContaining('cursors asset "hand" for package "platinum"'),
				expect.stringContaining(
					'systemArt asset "aliasBadge" for package "platinum"',
				),
			]);
		});

		it("skips an invalid nested icon leaf, naming its dotted path, and registers the rest of the tree", () => {
			registerClassicyAssets("icons", "mine", {
				system: { alias: "javascript:alert(1)", apple: "a.png" },
				ui: { ok: "ok.png" },
			});
			expect(
				resolveClassicyAsset("icons", "system.alias", "mine"),
			).toBeUndefined();
			expect(resolveClassicyAsset("icons", "system.apple", "mine")).toBe(
				"a.png",
			);
			expect(resolveClassicyAsset("icons", "ui.ok", "mine")).toBe("ok.png");
			expect(entries.map((e) => e.message)).toEqual([
				expect.stringContaining(
					'icons asset "system.alias" for package "mine"',
				),
			]);
		});

		it("omits a subtree whose leaves are all invalid, so it cannot turn a valid leaf into an empty namespace", () => {
			registerClassicyAssets("icons", "platinum", {
				system: { alias: "alias.png" },
			});
			registerClassicyAssets("icons", "platinum", {
				system: { alias: { badge: "javascript:alert(1)" } },
			});
			expect(resolveClassicyAsset("icons", "system.alias")).toBe("alias.png");
			expect(entries.map((e) => e.message)).toEqual([
				expect.stringContaining(
					'icons asset "system.alias.badge" for package "platinum"',
				),
			]);
		});

		it("skips an invalid wallpaper source", () => {
			registerClassicyWallpapers("platinum", [
				{ name: "Bad", src: 'x").png' },
				{ name: "Good", src: "good.png" },
			]);
			expect(resolveClassicyAsset("wallpapers", "Bad")).toBeUndefined();
			expect(resolveClassicyAsset("wallpapers", "Good")).toBe("good.png");
		});

		it("still accepts data: URIs and http(s) URLs", () => {
			registerClassicyCursors("platinum", {
				arrow: "data:image/svg+xml,<svg a='1'/>",
				hand: "https://x.test/hand.png",
			});
			expect(resolveClassicyAsset("cursors", "arrow")).toMatch(/^data:/);
			expect(resolveClassicyAsset("cursors", "hand")).toBe(
				"https://x.test/hand.png",
			);
			expect(entries).toHaveLength(0);
		});
	});
});
