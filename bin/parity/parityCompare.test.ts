import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import {
	compareAeDirs,
	findImageMagickCompare,
	type ParityAeResult,
	parseAeOutput,
	pngSize,
	summarizeAe,
} from "./parityCompare.ts";

// The PNG signature and an IHDR chunk: all pngSize reads.
const png = (width: number, height: number) => {
	const b = Buffer.alloc(33);
	Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(b, 0);
	b.writeUInt32BE(13, 8);
	b.write("IHDR", 12, "ascii");
	b.writeUInt32BE(width, 16);
	b.writeUInt32BE(height, 20);
	return b;
};

describe("pngSize", () => {
	it("reads the IHDR width and height", () =>
		expect(pngSize(png(1024, 768))).toEqual({ width: 1024, height: 768 }));

	it("returns null for a file that is not a PNG", () =>
		expect(
			pngSize(Buffer.from("not a png at all, not a png at all")),
		).toBeNull());
});

describe("compareAeDirs", () => {
	const root = mkdtempSync(join(tmpdir(), "parity-ae-"));
	afterAll(() => rmSync(root, { recursive: true, force: true }));
	const set = (name: string, files: Record<string, Buffer>) => {
		const dir = join(root, name);
		mkdirSync(dir, { recursive: true });
		for (const [f, b] of Object.entries(files)) writeFileSync(join(dir, f), b);
		return dir;
	};
	const calls: string[][] = [];
	const fakeCompare = (cmd: string, args: readonly string[]) => {
		calls.push([cmd, ...args]);
		return { status: 1, stdout: "", stderr: "7" };
	};

	it("reports a size change as an error without running compare, which would call it AE 0", () => {
		const before = set("b1", {
			"x--a.png": png(1024, 768),
			"x--b.png": png(1024, 768),
		});
		const after = set("a1", {
			"x--a.png": png(1024, 768),
			"x--b.png": png(1024, 800),
		});
		calls.length = 0;
		expect(
			compareAeDirs(before, after, undefined, ["compare"], fakeCompare),
		).toEqual([
			{ name: "x--a", ae: 7 },
			{ name: "x--b", error: "size differs: 1024x768 before, 1024x800 after" },
		]);
		expect(calls).toEqual([
			[
				"compare",
				"-metric",
				"AE",
				join(before, "x--a.png"),
				join(after, "x--a.png"),
				"null:",
			],
		]);
	});

	it("reports shots missing on either side and honors the filter", () => {
		const before = set("b2", { "x--a.png": png(1, 1), "y--a.png": png(1, 1) });
		const after = set("a2", { "x--b.png": png(1, 1), "y--b.png": png(1, 1) });
		expect(
			compareAeDirs(before, after, /^x--/, ["compare"], fakeCompare),
		).toEqual([
			{ name: "x--a", missing: "after" },
			{ name: "x--b", missing: "before" },
		]);
	});

	it("compares the mid-time shots too, each against its own @mid name", () => {
		const files = { "x--a.png": png(1, 1), "x--a@mid.png": png(1, 1) };
		const before = set("b3", files);
		const after = set("a3", { ...files, "y--a@mid.png": png(1, 1) });
		calls.length = 0;
		expect(
			compareAeDirs(before, after, undefined, ["compare"], fakeCompare),
		).toEqual([
			{ name: "x--a", ae: 7 },
			{ name: "x--a@mid", ae: 7 },
			{ name: "y--a@mid", missing: "before" },
		]);
		expect(calls.map((c) => c.slice(3, 5))).toEqual([
			[join(before, "x--a.png"), join(after, "x--a.png")],
			[join(before, "x--a@mid.png"), join(after, "x--a@mid.png")],
		]);
		expect(
			compareAeDirs(before, after, /@mid$/, ["compare"], fakeCompare).map(
				(r) => r.name,
			),
		).toEqual(["x--a@mid", "y--a@mid"]);
	});
});

describe("parseAeOutput", () => {
	it("reads ImageMagick 6's bare count and 7's count with the normalized value", () => {
		expect(parseAeOutput("0")).toBe(0);
		expect(parseAeOutput("1234\n")).toBe(1234);
		expect(parseAeOutput("1.23457e+06")).toBe(1234570);
		expect(parseAeOutput("17 (0.000259399)")).toBe(17);
	});

	it("returns null for an error message", () =>
		expect(
			parseAeOutput("compare: image widths or heights differ `a.png'"),
		).toBeNull());
});

describe("summarizeAe", () => {
	const results: ParityAeResult[] = [
		{ name: "a--one", ae: 0 },
		{ name: "b--two", ae: 12 },
		{ name: "c--three", missing: "before" },
		{ name: "d--four", missing: "after" },
		{ name: "e--five", error: "image widths or heights differ" },
	];

	it("writes one line per shot and a SUMMARY line, naming each failure", () => {
		const s = summarizeAe(results);
		expect(s.lines).toEqual([
			"0 a--one",
			"12 b--two",
			"MISSING-IN-BEFORE c--three",
			"MISSING-IN-AFTER d--four",
			"ERROR e--five image widths or heights differ",
			"SUMMARY total 5 zero 1 nonzero 1 missing 2 errors 1",
		]);
		expect(s.failures).toEqual([
			"12 b--two",
			"MISSING-IN-BEFORE c--three",
			"MISSING-IN-AFTER d--four",
			"ERROR e--five image widths or heights differ",
		]);
		expect(s.ok).toBe(false);
	});

	it("is ok only when every shot is AE 0 on both sides", () => {
		expect(summarizeAe([{ name: "a", ae: 0 }]).ok).toBe(true);
		expect(summarizeAe([]).ok).toBe(false);
	});
});

describe("findImageMagickCompare", () => {
	const runner =
		(working: Record<string, boolean>) =>
		(cmd: string, args: readonly string[]) => {
			const key = [cmd, ...args].join(" ");
			return working[key]
				? { status: 0, stdout: "Version: ImageMagick 6.9.11-60", stderr: "" }
				: { status: null, stdout: "", stderr: "", error: new Error("ENOENT") };
		};

	it("prefers `compare`, then `magick compare`", () => {
		expect(
			findImageMagickCompare(runner({ "compare -version": true })),
		).toEqual(["compare"]);
		expect(findImageMagickCompare(runner({ "magick -version": true }))).toEqual(
			["magick", "compare"],
		);
	});

	it("fails clearly when ImageMagick is missing", () =>
		expect(() => findImageMagickCompare(runner({}))).toThrow(
			/ImageMagick.*not found.*install/i,
		));
});
