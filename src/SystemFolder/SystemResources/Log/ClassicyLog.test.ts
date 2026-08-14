import { afterEach, describe, expect, it, vi } from "vitest";
import {
	type ClassicyLogEntry,
	classicyLog,
	emitClassicyCrash,
	getClassicyLogSinks,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const cleanupIds: string[] = [];
const sink = (id: string, hooks: Partial<Parameters<typeof registerClassicyLogSink>[0]>) => {
	cleanupIds.push(id);
	registerClassicyLogSink({ id, ...hooks });
};

afterEach(() => {
	for (const id of cleanupIds.splice(0)) unregisterClassicyLogSink(id);
	vi.restoreAllMocks();
});

describe("ClassicyLog sink registry", () => {
	it("registers, replaces on same id, and unregisters", () => {
		sink("a", {});
		sink("a", {});
		expect(getClassicyLogSinks().filter((s) => s.id === "a")).toHaveLength(1);
		unregisterClassicyLogSink("a");
		expect(getClassicyLogSinks().find((s) => s.id === "a")).toBeUndefined();
	});

	it("delivers every entry to onLog with full metadata", () => {
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const onLog = vi.fn();
		sink("meta", { onLog });
		classicyLog("warn", "TestSub", "something odd", { detail: 1 }, 42);
		expect(onLog).toHaveBeenCalledTimes(1);
		const entry = onLog.mock.calls[0][0] as ClassicyLogEntry;
		expect(entry.level).toBe("warn");
		expect(entry.subsystem).toBe("TestSub");
		expect(entry.message).toBe("something odd");
		expect(entry.details).toEqual([{ detail: 1 }, 42]);
		expect(Date.parse(entry.timestamp)).not.toBeNaN();
	});

	it("routes error-level entries to onError in addition to onLog", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const onLog = vi.fn();
		const onError = vi.fn();
		sink("err", { onLog, onError });
		classicyLog("warn", "S", "not an error");
		classicyLog("error", "S", "an error");
		expect(onLog).toHaveBeenCalledTimes(2);
		expect(onError).toHaveBeenCalledTimes(1);
		expect((onError.mock.calls[0][0] as ClassicyLogEntry).message).toBe(
			"an error",
		);
	});

	it("isolates a throwing sink so other sinks still receive the entry", () => {
		vi.spyOn(console, "error").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});
		const healthy = vi.fn();
		sink("bad", {
			onLog: () => {
				throw new Error("sink exploded");
			},
		});
		sink("good", { onLog: healthy });
		expect(() => classicyLog("warn", "S", "hello")).not.toThrow();
		expect(healthy).toHaveBeenCalledTimes(1);
	});

	it("mirrors errors to the console unconditionally", () => {
		const consoleError = vi
			.spyOn(console, "error")
			.mockImplementation(() => {});
		classicyLog("error", "Sub", "boom", 7);
		expect(consoleError).toHaveBeenCalledWith("[Sub] boom", 7);
	});

	it("fans crashes out to onCrash hooks only", () => {
		const onCrash = vi.fn();
		const onLog = vi.fn();
		sink("crash", { onCrash, onLog });
		const boom = new Error("render exploded");
		emitClassicyCrash(boom, "at <Desktop>");
		expect(onCrash).toHaveBeenCalledWith(boom, "at <Desktop>");
		expect(onLog).not.toHaveBeenCalled();
	});
});
