import {
	mkdirSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { PARITY_USAGE, runParity } from "./parity.ts";
import { PARITY_COMMANDS } from "./parityArgs.ts";

const capture = () => {
	const out: string[] = [];
	const err: string[] = [];
	return {
		out,
		err,
		io: { log: (s: string) => out.push(s), error: (s: string) => err.push(s) },
	};
};

describe("runParity", () => {
	it("prints a usage that names every command, and exits 0", async () => {
		const c = capture();
		expect(await runParity(["help"], {}, c.io)).toBe(0);
		for (const command of PARITY_COMMANDS)
			expect(c.out.join("\n")).toContain(command);
		expect(c.out.join("\n")).toBe(PARITY_USAGE);
	});

	it("exits 2 with the reason on a usage error", async () => {
		const c = capture();
		expect(await runParity(["shoot"], {}, c.io)).toBe(2);
		expect(c.err.join("\n")).toMatch(/shoot needs --out/);
	});

	describe("compare --kind computed", () => {
		const root = mkdtempSync(join(tmpdir(), "parity-cli-"));
		afterAll(() => rmSync(root, { recursive: true, force: true }));
		const set = (name: string, color: string) => {
			const dir = join(root, name);
			mkdirSync(dir, { recursive: true });
			writeFileSync(
				join(dir, "x--a.json"),
				JSON.stringify({ "0:DIV.a": { color }, __html: 1 }),
			);
			return dir;
		};

		it("exits 0 on identical sets and writes the full report to --summary", async () => {
			const c = capture();
			const summary = join(root, "out", "same.txt");
			expect(
				await runParity(
					[
						"compare",
						set("b", "red"),
						set("a", "red"),
						"--kind",
						"computed",
						"--summary",
						summary,
					],
					{},
					c.io,
				),
			).toBe(0);
			expect(readFileSync(summary, "utf8")).toContain("SAME x--a");
			expect(c.out.at(-1)).toBe(
				"SUMMARY total 1 identical 1 differ 0 missing 0",
			);
		});

		it("exits 1 and prints the differing dump by name", async () => {
			const c = capture();
			expect(
				await runParity(
					[
						"compare",
						set("b2", "red"),
						set("a2", "blue"),
						"--kind",
						"computed",
					],
					{},
					c.io,
				),
			).toBe(1);
			expect(c.out).toContain("DIFF x--a (1)");
		});
	});
});
