import { describe, expect, it } from "vitest";
import {
	loadPlaywright,
	PARITY_CHROMIUM_ARGS,
	shootUntilStable,
} from "./parityBrowser.ts";

describe("PARITY_CHROMIUM_ARGS", () => {
	it("holds the three flags that make Chromium's raster deterministic", () =>
		expect(PARITY_CHROMIUM_ARGS).toEqual([
			"--disable-gpu",
			"--disable-lcd-text",
			"--disable-partial-raster",
		]));
});

describe("loadPlaywright", () => {
	it("imports $PARITY_PLAYWRIGHT when set, else playwright", async () => {
		const seen: string[] = [];
		const importer = async (s: string) => {
			seen.push(s);
			return { chromium: {}, firefox: {} };
		};
		await loadPlaywright({}, importer);
		await loadPlaywright({ PARITY_PLAYWRIGHT: "/x/playwright" }, importer);
		expect(seen).toEqual(["playwright", "/x/playwright"]);
	});

	it("fails clearly when Playwright cannot be imported", async () =>
		await expect(
			loadPlaywright({}, async () => {
				throw new Error("Cannot find package 'playwright'");
			}),
		).rejects.toThrow(/Playwright.*pnpm install/s));
});

describe("shootUntilStable", () => {
	const page = (frames: string[]) => {
		let i = 0;
		return {
			shots: () => i,
			screenshot: async () =>
				Buffer.from(frames[Math.min(i++, frames.length - 1)]),
			waitForTimeout: async () => {},
		};
	};

	it("returns the first frame that matches the one before it", async () => {
		const p = page(["a", "b", "b", "c"]);
		const r = await shootUntilStable(p, { attempts: 8 });
		expect(r.buffer.toString()).toBe("b");
		expect(r.stable).toBe(true);
		expect(p.shots()).toBe(3);
	});

	it("keeps the last frame and reports it unstable when no two match", async () => {
		const p = page(["a", "b", "c", "d"]);
		const r = await shootUntilStable(p, { attempts: 4 });
		expect(r.buffer.toString()).toBe("d");
		expect(r.stable).toBe(false);
	});
});
