import { describe, expect, it } from "vitest";
import { parseParityArgs } from "./parityArgs.ts";

describe("parseParityArgs", () => {
	it("reads the command, its positionals and the shared options", () => {
		const o = parseParityArgs(
			[
				"compare",
				"a",
				"b",
				"--summary",
				"s.txt",
				"--filter",
				"^controls-",
				"--kind",
				"computed",
			],
			{},
		);
		expect(o.command).toBe("compare");
		expect(o.positionals).toEqual(["a", "b"]);
		expect(o.summary).toBe("s.txt");
		expect(o.filter?.test("controls-button--default")).toBe(true);
		expect(o.filter?.test("desktop-window--default")).toBe(false);
		expect(o.kind).toBe("computed");
	});

	it("defaults Storybook commands to localhost on $SB_PORT, else 6006", () => {
		expect(parseParityArgs(["shoot", "--out", "x"], {}).baseUrl).toBe(
			"http://localhost:6006",
		);
		expect(
			parseParityArgs(["shoot", "--out", "x"], { SB_PORT: "6091" }).baseUrl,
		).toBe("http://localhost:6091");
		expect(
			parseParityArgs(["shoot", "--out", "x", "--port", "6100"], {
				SB_PORT: "6091",
			}).baseUrl,
		).toBe("http://localhost:6100");
	});

	it("defaults the app command to 127.0.0.1 on $EXAMPLE_PORT, else 5173", () => {
		expect(parseParityArgs(["app", "--out", "x"], {}).baseUrl).toBe(
			"http://127.0.0.1:5173",
		);
		expect(
			parseParityArgs(["app", "--out", "x"], { EXAMPLE_PORT: "5391" }).baseUrl,
		).toBe("http://127.0.0.1:5391");
	});

	it("lets --base-url win over --port, without a trailing slash", () =>
		expect(
			parseParityArgs(
				["shoot", "--out", "x", "--port", "1", "--base-url", "http://h:9/sb/"],
				{},
			).baseUrl,
		).toBe("http://h:9/sb"));

	it("defaults workers to 4, kind to ae, browser to chromium and repo to the cwd", () => {
		const o = parseParityArgs(["shoot", "--out", "x"], {});
		expect(o.workers).toBe(4);
		expect(o.kind).toBe("ae");
		expect(o.browser).toBe("chromium");
		expect(o.repo).toBe(process.cwd());
	});

	it("parses --workers and rejects a non-positive count", () => {
		expect(
			parseParityArgs(["shoot", "--out", "x", "--workers", "2"], {}).workers,
		).toBe(2);
		expect(() =>
			parseParityArgs(["shoot", "--out", "x", "--workers", "0"], {}),
		).toThrow(/--workers/);
	});

	it("rejects an unknown option, an invalid regex and a bad --kind or --browser", () => {
		expect(() => parseParityArgs(["shoot", "--nope"], {})).toThrow();
		expect(() =>
			parseParityArgs(["shoot", "--out", "x", "--filter", "("], {}),
		).toThrow(/--filter/);
		expect(() =>
			parseParityArgs(["compare", "a", "b", "--kind", "pixels"], {}),
		).toThrow(/--kind/);
		expect(() =>
			parseParityArgs(["forced", "--out", "x", "--browser", "webkit"], {}),
		).toThrow(/--browser/);
	});

	it("requires --out for the commands that write a set", () => {
		for (const command of ["shoot", "app", "dump", "forced"])
			expect(() => parseParityArgs([command], {})).toThrow(/--out/);
	});

	it("requires two directories for compare", () =>
		expect(() => parseParityArgs(["compare", "a"], {})).toThrow(
			/<beforeDir> <afterDir>/,
		));

	it("rejects an unknown command and treats no command as help", () => {
		expect(() => parseParityArgs(["shot"], {})).toThrow(/unknown command/);
		expect(parseParityArgs([], {}).command).toBe("help");
		expect(parseParityArgs(["--help"], {}).command).toBe("help");
	});

	describe("mid-time shots", () => {
		it("are off unless asked for", () =>
			expect(parseParityArgs(["shoot", "--out", "x"], {}).mid).toBeUndefined());

		it("--mid turns them on at 50% with the default JS clock, beside the t=0 set", () =>
			expect(parseParityArgs(["shoot", "--out", "x", "--mid"], {}).mid).toEqual(
				{
					at: { unit: "%", value: 50 },
					atSpec: "50%",
					clockMs: 2000,
					only: false,
					stories: undefined,
				},
			));

		it("--at, --mid-only, --mid-stories and --mid-clock each imply --mid", () => {
			const at = parseParityArgs(["shoot", "--out", "x", "--at", "400ms"], {});
			expect(at.mid?.at).toEqual({ unit: "ms", value: 400 });
			expect(at.mid?.clockMs).toBe(400);
			expect(
				parseParityArgs(["shoot", "--out", "x", "--mid-only"], {}).mid?.only,
			).toBe(true);
			expect(
				parseParityArgs(["shoot", "--out", "x", "--mid-stories", "l.txt"], {})
					.mid?.stories,
			).toBe("l.txt");
			expect(
				parseParityArgs(["shoot", "--out", "x", "--mid-clock", "0"], {}).mid
					?.clockMs,
			).toBe(0);
		});

		it("rejects a bad --at or --mid-clock", () => {
			expect(() =>
				parseParityArgs(["shoot", "--out", "x", "--at", "400"], {}),
			).toThrow(/--at/);
			expect(() =>
				parseParityArgs(["shoot", "--out", "x", "--mid-clock", "-1"], {}),
			).toThrow(/--mid-clock/);
			expect(() =>
				parseParityArgs(["shoot", "--out", "x", "--mid-clock", "1.5"], {}),
			).toThrow(/--mid-clock/);
		});

		it("belong to shoot only", () =>
			expect(() =>
				parseParityArgs(["dump", "--out", "x", "--mid"], {}),
			).toThrow(/shoot/));
	});
});
