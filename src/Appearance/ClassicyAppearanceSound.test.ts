import { readFileSync } from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	playClassicyAppearanceSound,
	runWithClassicyAppearanceSoundDispatch,
} from "@/Appearance/ClassicyAppearanceSound";
import {
	type ClassicyLogEntry,
	registerClassicyLogSink,
	unregisterClassicyLogSink,
} from "@/SystemFolder/SystemResources/Log/ClassicyLog";

const SINK_ID = "appearance-sound-test";
let entries: ClassicyLogEntry[];

beforeEach(() => {
	entries = [];
	registerClassicyLogSink({
		id: SINK_ID,
		onLog: (entry) => entries.push(entry),
	});
	// The dev console mirror of the expected warning; keep the output clean.
	vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
	unregisterClassicyLogSink(SINK_ID);
	vi.restoreAllMocks();
});

describe("playClassicyAppearanceSound", () => {
	it("warns and ignores a sound outside a handler", () => {
		expect(() =>
			playClassicyAppearanceSound("ClassicyButtonClickDown"),
		).not.toThrow();
		const warnings = entries.filter((entry) => entry.level === "warn");
		expect(warnings).toHaveLength(1);
		expect(warnings[0]).toMatchObject({
			subsystem: "ClassicyAppearance",
			message:
				"playClassicyAppearanceSound was called outside an appearance handler; ignored.",
		});
	});

	it("dispatches ClassicySoundPlay, or ClassicySoundPlayInterrupt when asked", () => {
		const dispatch = vi.fn();
		runWithClassicyAppearanceSoundDispatch(dispatch, () => {
			playClassicyAppearanceSound("ClassicyButtonClickDown");
			playClassicyAppearanceSound("ClassicyWindowClose", { interrupt: true });
		});
		expect(dispatch.mock.calls).toEqual([
			[{ type: "ClassicySoundPlay", sound: "ClassicyButtonClickDown" }],
			[{ type: "ClassicySoundPlayInterrupt", sound: "ClassicyWindowClose" }],
		]);
		expect(entries).toHaveLength(0);
	});

	it("restores the previous dispatch after a nested run", () => {
		const a = vi.fn();
		const b = vi.fn();
		runWithClassicyAppearanceSoundDispatch(a, () => {
			runWithClassicyAppearanceSoundDispatch(b, () =>
				playClassicyAppearanceSound("inner"),
			);
			playClassicyAppearanceSound("outer");
		});
		expect(b).toHaveBeenCalledExactlyOnceWith({
			type: "ClassicySoundPlay",
			sound: "inner",
		});
		expect(a).toHaveBeenCalledExactlyOnceWith({
			type: "ClassicySoundPlay",
			sound: "outer",
		});
	});

	it("returns the run's result and restores the dispatch when it throws", () => {
		const a = vi.fn();
		expect(runWithClassicyAppearanceSoundDispatch(a, () => 42)).toBe(42);
		expect(() =>
			runWithClassicyAppearanceSoundDispatch(a, () => {
				throw new Error("boom");
			}),
		).toThrow("boom");
		playClassicyAppearanceSound("after");
		expect(a).not.toHaveBeenCalled();
		expect(entries.filter((entry) => entry.level === "warn")).toHaveLength(1);
	});
});

describe("ClassicyAppearanceSound module", () => {
	// A package's hooks module imports the bridge; keeping it a runtime leaf
	// (types plus the leaf log module) keeps the store and the sound manager
	// out of that graph.
	it("imports at runtime only the leaf log module", () => {
		const source = readFileSync(
			path.resolve(process.cwd(), "src/Appearance/ClassicyAppearanceSound.ts"),
			"utf8",
		);
		const runtimeImports = (
			source.match(/^\s*(?:import|export)\b[^;]*\bfrom\s+["'][^"']+["']/gm) ??
			[]
		).filter((line) => !/^\s*import type\b/.test(line));
		expect(
			runtimeImports.map((line) => line.match(/["']([^"']+)["']/)?.[1]),
		).toEqual(["@/SystemFolder/SystemResources/Log/ClassicyLog"]);
		expect(source).not.toMatch(/\bimport\s*\(|\brequire\s*\(/);
		expect(source).not.toMatch(/^\s*import\s+["']/m);
	});
});
