import { describe, expect, it } from "vitest";
import {
	compareComputedDumps,
	compareForcedDumps,
	normalizeParityUrls,
} from "./parityDumpCompare.ts";

describe("normalizeParityUrls", () => {
	it("rewrites the recorded origin and checkout to ORIGIN/", () =>
		expect(
			normalizeParityUrls(
				'url("http://localhost:6091/@fs/home/me/src/classicy/.claude/worktrees/w/src/a.svg") http://localhost:6091/x',
				{
					baseUrl: "http://localhost:6091",
					repo: "/home/me/src/classicy/.claude/worktrees/w",
				},
			),
		).toBe('url("ORIGIN/src/a.svg") ORIGIN/x'));

	it("falls back to any local origin and the checkout before src/ for dumps without a record", () =>
		expect(
			normalizeParityUrls(
				'"http://localhost:6020/@fs/home/r/classicy/.claude/worktrees/part-b-43b/src/a.svg" "http://127.0.0.1:5/@fs/home/r/classicy/src/b.svg" "http://localhost:6020/iframe.html"',
			),
		).toBe('"ORIGIN/src/a.svg" "ORIGIN/src/b.svg" "ORIGIN/iframe.html"'));
});

describe("compareComputedDumps", () => {
	const dump = (color: string, extra: Record<string, unknown> = {}) => ({
		"0:DIV.a": { color, "margin-top": "0px" },
		"1:DIV.classicyDesktopIconImage": { "margin-left": "3px" },
		__active: { tag: "BODY" },
		__html: 100,
		__origin: { baseUrl: "http://localhost:1", repo: "/r" },
		...extra,
	});

	it("finds no difference between equal dumps, whatever their origin record", () =>
		expect(
			compareComputedDumps(dump("red"), {
				...dump("red"),
				__origin: { baseUrl: "http://localhost:2", repo: "/s" },
				__html: 104,
			}),
		).toEqual([]));

	it("reports a changed property and an element on one side only", () =>
		expect(
			compareComputedDumps(dump("red"), dump("blue", { "2:SPAN.b": {} })),
		).toEqual([
			"0:DIV.a color: red -> blue",
			"2:SPAN.b: element missing on one side",
		]));

	it("ignores the desktop icon image's layout-dependent margins", () =>
		expect(
			compareComputedDumps(dump("red"), {
				...dump("red"),
				"1:DIV.classicyDesktopIconImage": { "margin-left": "4px" },
			}),
		).toEqual([]));

	it("reports a focus change", () =>
		expect(
			compareComputedDumps(
				dump("red"),
				dump("red", { __active: { tag: "INPUT" } }),
			),
		).toEqual(['__active: {"tag":"BODY"} -> {"tag":"INPUT"}']));
});

describe("compareForcedDumps", () => {
	it("ignores __matchedPseudo and __origin and reports every other difference", () => {
		const before = {
			__target: ".x",
			__matchedPseudo: { a: 1 },
			__origin: { baseUrl: "a", repo: "b" },
			"0:DIV.x": { color: "red", top: "0px" },
		};
		expect(
			compareForcedDumps(before, {
				...before,
				__matchedPseudo: { a: 2 },
				__origin: { baseUrl: "c", repo: "d" },
			}),
		).toEqual([]);
		expect(
			compareForcedDumps(before, {
				...before,
				__target: ".y",
				"0:DIV.x": { color: "blue", top: "0px" },
			}),
		).toEqual(["0:DIV.x color: red -> blue", "__target: .x -> .y"]);
	});
});
