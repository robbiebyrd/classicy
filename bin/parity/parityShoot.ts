// Shoot every story: one 1024x768 PNG per story id, `<out>/<id>.png`.
// Deterministic, so a before set and an after set differ only where the code
// does: a fresh context per story (empty storage), the fixed Date, the
// readiness wait, transitions finished and animations parked at t=0, 500 ms,
// settled again, then shots until two consecutive frames are byte-identical
// (at most 8; the last is kept), with Playwright's `animations: "disabled"`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import {
	launchParityBrowser,
	newStoryPage,
	runPool,
	settleAnimations,
	shootUntilStable,
	waitForStoryReady,
} from "./parityBrowser.ts";
import { storyUrl } from "./parityStories.ts";

export type ParityShootResult = {
	shot: number;
	errors: string[];
	/** Stories whose eight shots never matched twice in a row. */
	unstable: string[];
};

export async function shootStories({
	baseUrl,
	out,
	ids,
	workers,
}: {
	baseUrl: string;
	out: string;
	ids: readonly string[];
	workers: number;
}): Promise<ParityShootResult> {
	mkdirSync(out, { recursive: true });
	writeFileSync(join(out, "stories.txt"), `${ids.join("\n")}\n`);
	const browser = await launchParityBrowser("chromium");
	const result: ParityShootResult = { shot: 0, errors: [], unstable: [] };
	try {
		await runPool(ids, workers, async (id) => {
			const { ctx, page } = await newStoryPage(browser);
			try {
				await page.goto(storyUrl(baseUrl, id), {
					waitUntil: "networkidle",
					timeout: 90000,
				});
				await waitForStoryReady(page);
				await settleAnimations(page);
				await page.waitForTimeout(500);
				await settleAnimations(page);
				const shot = await shootUntilStable(page, { animations: "disabled" });
				writeFileSync(join(out, `${id}.png`), shot.buffer);
				result.shot++;
				if (!shot.stable) result.unstable.push(id);
			} catch (e) {
				result.errors.push(id);
				console.error(`ERROR ${id} ${String(e).slice(0, 200)}`);
			} finally {
				await ctx.close();
			}
		});
	} finally {
		await browser.close();
	}
	return result;
}
