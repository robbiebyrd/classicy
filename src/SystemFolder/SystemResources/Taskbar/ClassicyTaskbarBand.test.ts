// The taskbar's band (plan 0020-w98 §2, "The band"): a store-free source of
// the height a mounted taskbar takes along the desktop's bottom, which window
// geometry, the desktop icon grid and menu placement keep out of the room
// they use. 0 while no taskbar is mounted, so nothing else changes.
import { readFileSync } from "node:fs";
import { act, render } from "@testing-library/react";
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";
import {
	CLASSICY_TASKBAR_NO_INSETS,
	classicyTaskbarHasBand,
	classicyTaskbarInsetsOf,
	getClassicyTaskbarBand,
	getClassicyTaskbarInsets,
	isClassicyTaskbarEdge,
	resetClassicyTaskbarBandForTests,
	setClassicyTaskbarBand,
	subscribeClassicyTaskbarBand,
	useClassicyTaskbarBand,
	useClassicyTaskbarInsets,
} from "@/SystemFolder/SystemResources/Taskbar/ClassicyTaskbarBand.internal";

const Probe = () => createElement("output", null, useClassicyTaskbarBand());

describe("the taskbar band", () => {
	it("is 0 while no taskbar has published one", () =>
		expect(getClassicyTaskbarBand()).toBe(0));

	it("is the height a taskbar publishes, until it publishes 0", () => {
		setClassicyTaskbarBand(28);
		expect(getClassicyTaskbarBand()).toBe(28);
		setClassicyTaskbarBand(30);
		expect(getClassicyTaskbarBand()).toBe(30);
		setClassicyTaskbarBand(0);
		expect(getClassicyTaskbarBand()).toBe(0);
	});

	it("tells its listeners only of a change of the band in effect", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyTaskbarBand(listener);
		setClassicyTaskbarBand(28);
		setClassicyTaskbarBand(28);
		expect(listener).toHaveBeenCalledTimes(1);
		setClassicyTaskbarBand(0);
		expect(listener).toHaveBeenCalledTimes(2);
		setClassicyTaskbarBand(0);
		expect(listener).toHaveBeenCalledTimes(2);
		unsubscribe();
		setClassicyTaskbarBand(28);
		expect(listener).toHaveBeenCalledTimes(2);
	});

	it("is the tallest band any owner has published", () => {
		const first = Symbol("first taskbar");
		const second = {};
		setClassicyTaskbarBand(28, first);
		setClassicyTaskbarBand(30, second);
		expect(getClassicyTaskbarBand()).toBe(30);
		// One taskbar going leaves the other's band in effect.
		setClassicyTaskbarBand(0, second);
		expect(getClassicyTaskbarBand()).toBe(28);
		setClassicyTaskbarBand(0, first);
		expect(getClassicyTaskbarBand()).toBe(0);
	});

	it("shares one owner among callers that name none", () => {
		setClassicyTaskbarBand(28);
		setClassicyTaskbarBand(24);
		expect(getClassicyTaskbarBand()).toBe(24);
	});

	it("keeps an owner's band when another owner withdraws one it never published", () => {
		setClassicyTaskbarBand(28, Symbol("published"));
		setClassicyTaskbarBand(0, Symbol("never published"));
		expect(getClassicyTaskbarBand()).toBe(28);
	});

	describe("a value that is no height", () => {
		const entries: ClassicyLogEntry[] = [];
		beforeEach(() => {
			entries.length = 0;
			registerClassicyLogSink({
				id: "taskbar-band-test",
				onLog: (entry) => entries.push(entry),
			});
			vi.spyOn(console, "warn").mockImplementation(() => {});
		});
		afterEach(() => {
			unregisterClassicyLogSink("taskbar-band-test");
			vi.restoreAllMocks();
		});

		it.each([
			Number.NaN,
			-1,
			Number.POSITIVE_INFINITY,
			"28" as unknown as number,
		])("is logged and taken as 0: %s", (value) => {
			setClassicyTaskbarBand(28);
			setClassicyTaskbarBand(value);
			expect(getClassicyTaskbarBand()).toBe(0);
			expect(entries).toEqual([
				expect.objectContaining({ level: "warn", subsystem: "Taskbar" }),
			]);
		});
	});

	it("withdraws every band for the next test", () => {
		setClassicyTaskbarBand(28);
		setClassicyTaskbarBand(30, Symbol("another taskbar"));
		resetClassicyTaskbarBandForTests();
		expect(getClassicyTaskbarBand()).toBe(0);
	});
});

describe("useClassicyTaskbarBand", () => {
	it("re-renders with each change of the band", () => {
		const { container } = render(createElement(Probe));
		expect(container.textContent).toBe("0");
		act(() => setClassicyTaskbarBand(28));
		expect(container.textContent).toBe("28");
		act(() => setClassicyTaskbarBand(0));
		expect(container.textContent).toBe("0");
	});

	it("is 0 on the server, where no taskbar is mounted", () => {
		setClassicyTaskbarBand(28);
		expect(renderToString(createElement(Probe))).toBe("<output>0</output>");
	});
});

// Internal: the library barrel never exports it, so its shape may change
// with the taskbar.
it("stays out of the library barrel", () =>
	expect(readFileSync("src/index.ts", "utf8")).not.toContain(
		"ClassicyTaskbarBand",
	));

// Plan 0020-w98 E4, docking: a taskbar moved to another edge takes its band
// there, and every reader of the bottom's band reads 0 then.
describe("the band on each edge", () => {
	afterEach(() => resetClassicyTaskbarBandForTests());

	it("has none on any edge while no taskbar publishes one", () => {
		expect(getClassicyTaskbarInsets()).toBe(CLASSICY_TASKBAR_NO_INSETS);
		expect(classicyTaskbarHasBand(getClassicyTaskbarInsets())).toBe(false);
	});

	it("lies on the edge the taskbar publishes it on, the bottom by default", () => {
		const owner = {};
		setClassicyTaskbarBand(28, owner);
		expect(getClassicyTaskbarInsets()).toEqual({
			top: 0,
			right: 0,
			bottom: 28,
			left: 0,
		});
		setClassicyTaskbarBand(28, owner, "top");
		expect(getClassicyTaskbarInsets()).toEqual({
			top: 28,
			right: 0,
			bottom: 0,
			left: 0,
		});
		// The bottom's band, which every older reader takes, is 0 then.
		expect(getClassicyTaskbarBand()).toBe(0);
		setClassicyTaskbarBand(60, owner, "left");
		expect(getClassicyTaskbarInsets().left).toBe(60);
		expect(getClassicyTaskbarInsets().top).toBe(0);
		setClassicyTaskbarBand(0, owner, "left");
		expect(getClassicyTaskbarInsets()).toBe(CLASSICY_TASKBAR_NO_INSETS);
	});

	it("keeps each edge's thickest band, owner by owner", () => {
		const a = {};
		const b = {};
		setClassicyTaskbarBand(28, a, "right");
		setClassicyTaskbarBand(40, b, "right");
		expect(getClassicyTaskbarInsets().right).toBe(40);
		setClassicyTaskbarBand(0, b);
		expect(getClassicyTaskbarInsets().right).toBe(28);
	});

	it("replaces the insets object only on a change, so it serves as a snapshot", () => {
		const listener = vi.fn();
		const unsubscribe = subscribeClassicyTaskbarBand(listener);
		setClassicyTaskbarBand(28, undefined, "top");
		const first = getClassicyTaskbarInsets();
		setClassicyTaskbarBand(28, undefined, "top");
		expect(getClassicyTaskbarInsets()).toBe(first);
		expect(listener).toHaveBeenCalledTimes(1);
		unsubscribe();
	});

	it("takes an edge that is not one as 0, with a warning", () => {
		const entries: ClassicyLogEntry[] = [];
		registerClassicyLogSink({
			id: "band-edge",
			onLog: (entry) => entries.push(entry),
		});
		setClassicyTaskbarBand(
			28,
			undefined,
			"middle" as unknown as Parameters<typeof setClassicyTaskbarBand>[2],
		);
		unregisterClassicyLogSink("band-edge");
		expect(getClassicyTaskbarInsets()).toBe(CLASSICY_TASKBAR_NO_INSETS);
		expect(entries.map((e) => e.level)).toEqual(["warn"]);
	});

	it("re-renders a reader of every edge on a change", () => {
		const Edges = () =>
			createElement("output", null, JSON.stringify(useClassicyTaskbarInsets()));
		const { container } = render(createElement(Edges));
		act(() => setClassicyTaskbarBand(60, undefined, "left"));
		expect(JSON.parse(container.textContent ?? "{}")).toEqual({
			top: 0,
			right: 0,
			bottom: 0,
			left: 60,
		});
	});

	it("reads a number as the bottom's band, and insets as given", () => {
		expect(classicyTaskbarInsetsOf(28)).toEqual({
			top: 0,
			right: 0,
			bottom: 28,
			left: 0,
		});
		expect(classicyTaskbarInsetsOf(0)).toBe(CLASSICY_TASKBAR_NO_INSETS);
		expect(classicyTaskbarInsetsOf(undefined)).toBe(CLASSICY_TASKBAR_NO_INSETS);
		expect(
			classicyTaskbarInsetsOf({
				top: 5,
				right: -1,
				bottom: Number.NaN,
				left: 3,
			}),
		).toEqual({ top: 5, right: 0, bottom: 0, left: 3 });
		expect(classicyTaskbarHasBand(28)).toBe(true);
		expect(classicyTaskbarHasBand(0)).toBe(false);
	});

	it("knows its edges", () => {
		for (const edge of ["top", "right", "bottom", "left"])
			expect(isClassicyTaskbarEdge(edge)).toBe(true);
		for (const value of ["Top", "", null, 1, undefined])
			expect(isClassicyTaskbarEdge(value)).toBe(false);
	});
});
