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
	getClassicyTaskbarBand,
	resetClassicyTaskbarBandForTests,
	setClassicyTaskbarBand,
	subscribeClassicyTaskbarBand,
	useClassicyTaskbarBand,
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
