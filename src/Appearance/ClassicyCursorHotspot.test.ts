import { renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
	registerClassicyAssets,
	registerClassicyCursors,
	resetClassicyAssets,
	resolveClassicyAsset,
	resolveClassicyCursorHotspot,
	useClassicyAssetVars,
} from "@/Appearance/ClassicyAssetRegistry";
import { useClassicyCursor } from "@/SystemFolder/SystemResources/Cursor/useClassicyCursor";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

// A cursor's hotspot (plan 0018-dbd §4.1): System 7's CURS resources point
// elsewhere than the 8 8 the stylesheets assume, so a package registers
// `{ src, hotspot }` and the hotspot travels with the image.

describe("cursor hotspots", () => {
	const warnings: string[] = [];
	beforeEach(() => {
		resetClassicyAssets();
		warnings.length = 0;
		registerClassicyLogSink({
			id: "hotspot-test",
			onLog: (entry: ClassicyLogEntry) => {
				if (entry.level === "warn") warnings.push(entry.message);
			},
		});
		document.body.style.cursor = "";
	});
	afterEach(() => {
		unregisterClassicyLogSink("hotspot-test");
		document.body.style.cursor = "";
	});

	it("registers the image of a { src, hotspot } cursor and its hotspot", () => {
		registerClassicyCursors("platinum", {
			ibeam: { src: "ibeam.png", hotspot: [7, 4] },
			watch: "watch.png",
		});
		expect(resolveClassicyAsset("cursors", "ibeam")).toBe("ibeam.png");
		expect(resolveClassicyCursorHotspot("ibeam")).toEqual([7, 4]);
		expect(resolveClassicyCursorHotspot("watch")).toBeUndefined();
	});

	it("publishes --classicy-cursor-<role>-hotspot only for a cursor with one", () => {
		registerClassicyCursors("platinum", {
			resizeLr: { src: "lr.png", hotspot: [3, 9] },
			watch: "watch.png",
		});
		const { result } = renderHook(() => useClassicyAssetVars());
		expect(result.current).toEqual({
			"--classicy-cursor-resize-lr": 'url("lr.png")',
			"--classicy-cursor-resize-lr-hotspot": "3 9",
			"--classicy-cursor-watch": 'url("watch.png")',
		});
	});

	it("follows the image the role resolves to, from whichever tree", () => {
		// The default package's cursor has a hotspot; another package's image
		// for the role has none, so the role has none while that package draws.
		registerClassicyCursors("platinum", {
			crosshair: { src: "cross.png", hotspot: [5, 5] },
		});
		registerClassicyCursors("other", { crosshair: "other-cross.png" });
		expect(resolveClassicyCursorHotspot("crosshair", "other")).toBeUndefined();
		expect(resolveClassicyCursorHotspot("crosshair", "platinum")).toEqual([
			5, 5,
		]);
		// A package that registers nothing for the role falls back to the
		// default package's image, and with it its hotspot.
		expect(resolveClassicyCursorHotspot("crosshair", "third")).toEqual([5, 5]);
	});

	it("reads a variant's cursor and hotspot over the base tree", () => {
		registerClassicyCursors("platinum", {
			watch: { src: "watch.png", hotspot: [8, 8] },
		});
		registerClassicyCursors(
			"platinum",
			{ watch: { src: "watch-bw.png", hotspot: [1, 2] } },
			{ variant: "bw" },
		);
		expect(resolveClassicyCursorHotspot("watch", "platinum", "bw")).toEqual([
			1, 2,
		]);
		expect(resolveClassicyCursorHotspot("watch", "platinum")).toEqual([8, 8]);
	});

	it.each([
		["a negative coordinate", [-1, 4]],
		["a fraction", [1.5, 4]],
		["one past the largest", [128, 0]],
		["one number", [3]],
		["a string", "7 4"],
	])("keeps the image and ignores %s, with a warning", (_name, hotspot) => {
		registerClassicyCursors("platinum", {
			// @ts-expect-error: the invalid hotspot is the point
			ibeam: { src: "ibeam.png", hotspot },
		});
		expect(resolveClassicyAsset("cursors", "ibeam")).toBe("ibeam.png");
		expect(resolveClassicyCursorHotspot("ibeam")).toBeUndefined();
		expect(warnings).toEqual([
			'Ignored the hotspot of cursor "ibeam" for package "platinum": not two whole numbers from 0 to 127',
		]);
	});

	it("accepts the edges 0 and 127", () => {
		registerClassicyCursors("platinum", {
			arrow: { src: "a.png", hotspot: [0, 127] },
		});
		expect(resolveClassicyCursorHotspot("arrow")).toEqual([0, 127]);
		expect(warnings).toEqual([]);
	});

	it("a cursor registered through registerClassicyAssets has no hotspot", () => {
		registerClassicyAssets("cursors", "platinum", { watch: "w.png" });
		expect(resolveClassicyCursorHotspot("watch")).toBeUndefined();
	});

	it("resetClassicyAssets forgets the hotspots", () => {
		registerClassicyCursors("platinum", {
			ibeam: { src: "ibeam.png", hotspot: [7, 4] },
		});
		resetClassicyAssets();
		registerClassicyCursors("platinum", { ibeam: "ibeam.png" });
		expect(resolveClassicyCursorHotspot("ibeam")).toBeUndefined();
	});

	it("useClassicyCursor sets the body cursor at the registered hotspot", () => {
		registerClassicyCursors("platinum", {
			ibeam: { src: "ibeam.png", hotspot: [7, 4] },
			watch: "watch.png",
		});
		const { result } = renderHook(() => useClassicyCursor());
		result.current("ibeam");
		expect(document.body.style.cursor).toBe('url("ibeam.png") 7 4, auto');
		// Without one the image's top left, as before.
		result.current("watch");
		expect(document.body.style.cursor).toBe('url("watch.png"), auto');
	});
});
