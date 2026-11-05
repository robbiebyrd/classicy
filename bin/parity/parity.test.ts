import { describe, expect, it } from "vitest";
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

	it("treats probe, dump and forced as unknown commands (exit 2)", async () => {
		for (const command of ["probe", "dump", "forced"]) {
			const c = capture();
			expect(await runParity([command, "--out", "x"], {}, c.io)).toBe(2);
			expect(c.err.join("\n")).toMatch(/unknown command/);
		}
	});

	it("names none of the removed commands in its usage", () =>
		expect(PARITY_USAGE).not.toMatch(/\b(probe|dump|forced)\b/));

	it("rejects --kind computed and forced with exit 2", async () => {
		for (const kind of ["computed", "forced"]) {
			const c = capture();
			expect(
				await runParity(["compare", "a", "b", "--kind", kind], {}, c.io),
			).toBe(2);
			expect(c.err.join("\n")).toMatch(/--kind.*removed/);
		}
	});

	describe("compare (ae)", () => {
		it("exits 2 when a directory is missing", async () => {
			const c = capture();
			expect(
				await runParity(
					["compare", "/nonexistent-a", "/nonexistent-b"],
					{},
					c.io,
				),
			).toBe(2);
			expect(c.err.join("\n")).toMatch(/no such directory/);
		});
	});
});
