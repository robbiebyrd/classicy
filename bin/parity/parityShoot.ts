// Shoot every story: one 1024x768 PNG per story id, `<out>/<id>.png`.
// Deterministic, so a before set and an after set differ only where the code
// does: a fresh context per story (empty storage), the fixed Date, the
// readiness wait, transitions finished and animations parked at t=0, 500 ms,
// settled again, then shots until two consecutive frames are byte-identical
// (at most 8; the last is kept), with Playwright's `animations: "disabled"`.
//
// With `mid`, a story that has animations at ready time (or is on the
// `--mid-stories` list) is also shot mid-animation, `<out>/<id>@mid.png`, in
// a fresh context of its own so the t=0 shot is untouched: the JS clock moved
// on, every animation paused at its mid time (parityMidTime.ts), frozen again
// as late starters appear, then shots until two frames match.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "playwright";
import type { ParityMidOptions } from "./parityArgs.ts";
import {
	launchParityBrowser,
	newStoryPage,
	PARITY_STORY_TIME,
	runPool,
	settleAnimations,
	shootUntilStable,
	waitForStoryReady,
} from "./parityBrowser.ts";
import {
	midFreezeScript,
	midShotName,
	type ParityMidAt,
	selectsMidShot,
} from "./parityMidTime.ts";
import { storyUrl } from "./parityStories.ts";

export type ParityShootResult = {
	shot: number;
	errors: string[];
	/** Stories whose eight shots never matched twice in a row. */
	unstable: string[];
	/** Stories shot mid-animation (`<id>@mid.png`), sorted. */
	mid: string[];
};

const countAnimations = (page: Page) =>
	page.evaluate(() => document.getAnimations().length);

type ParityMidPage = {
	freeze: (at: unknown) => number;
	watch: (at: unknown) => void;
	state: (at: unknown) => { unfrozen: number; seen: number };
};

/** Freeze every animation at its mid time, a frame apart, twice. */
const freezeMid = (page: Page, at: ParityMidAt) =>
	page.evaluate(async (at) => {
		const mid = (window as unknown as { __parityMid: ParityMidPage })
			.__parityMid;
		for (let i = 0; i < 2; i++) {
			mid.freeze(at);
			await new Promise<void>((r) => requestAnimationFrame(() => r()));
		}
	}, at);

const midState = (page: Page, at: ParityMidAt) =>
	page.evaluate(
		(at) =>
			(window as unknown as { __parityMid: ParityMidPage }).__parityMid.state(
				at,
			),
		at,
	);

/** The mid-time shot of a ready page: the fixed Date moved on by `clockMs`
 * (so Date.now-driven state, such as the startup progress, advances), every
 * animation frozen at its mid time and watched for late starters, 500 ms,
 * frozen again, then the stable shot. The shot is retaken (up to three
 * rounds, else reported unstable) unless every animation was still frozen
 * after it and none was caught during it: a late starter that runs unfrozen
 * through the shot can still give two matching frames. No
 * `animations: "disabled"`: it would finish or cancel the paused animations. */
async function shootMid(page: Page, mid: ParityMidOptions) {
	await page.evaluate(midFreezeScript());
	await page.clock.setFixedTime(PARITY_STORY_TIME.getTime() + mid.clockMs);
	await page.evaluate(
		(at) =>
			(window as unknown as { __parityMid: ParityMidPage }).__parityMid.watch(
				at,
			),
		mid.at,
	);
	await freezeMid(page, mid.at);
	await page.waitForTimeout(500);
	let shot: Awaited<ReturnType<typeof shootUntilStable>> | undefined;
	for (let round = 0; round < 3; round++) {
		await freezeMid(page, mid.at);
		const before = await midState(page, mid.at);
		shot = await shootUntilStable(page);
		const after = await midState(page, mid.at);
		if (shot.stable && after.unfrozen === 0 && after.seen === before.seen)
			return shot;
	}
	return { ...(shot as NonNullable<typeof shot>), stable: false };
}

export async function shootStories({
	baseUrl,
	out,
	ids,
	workers,
	mid,
	midStories = [],
}: {
	baseUrl: string;
	out: string;
	ids: readonly string[];
	workers: number;
	mid?: ParityMidOptions;
	/** Ids that get a mid shot even without animations at ready time. */
	midStories?: readonly string[];
}): Promise<ParityShootResult> {
	mkdirSync(out, { recursive: true });
	writeFileSync(join(out, "stories.txt"), `${ids.join("\n")}\n`);
	const forced = new Set(midStories);
	const browser = await launchParityBrowser();
	const result: ParityShootResult = {
		shot: 0,
		errors: [],
		unstable: [],
		mid: [],
	};
	/** Run `fn` on the story's ready page, in a fresh context closed after. */
	const onStory = async <T>(id: string, fn: (page: Page) => Promise<T>) => {
		const { ctx, page } = await newStoryPage(browser);
		try {
			await page.goto(storyUrl(baseUrl, id), {
				waitUntil: "networkidle",
				timeout: 90000,
			});
			await waitForStoryReady(page);
			return await fn(page);
		} finally {
			await ctx.close();
		}
	};
	const fail = (name: string, e: unknown) => {
		result.errors.push(name);
		console.error(`ERROR ${name} ${String(e).slice(0, 200)}`);
	};
	try {
		await runPool(ids, workers, async (id) => {
			// Animations at ready time, read on the t=0 page when there is one.
			let animated: number | undefined;
			if (!mid?.only) {
				try {
					await onStory(id, async (page) => {
						if (mid) animated = await countAnimations(page);
						await settleAnimations(page);
						await page.waitForTimeout(500);
						await settleAnimations(page);
						const shot = await shootUntilStable(page, {
							animations: "disabled",
						});
						writeFileSync(join(out, `${id}.png`), shot.buffer);
						result.shot++;
						if (!shot.stable) result.unstable.push(id);
					});
				} catch (e) {
					fail(id, e);
					return;
				}
			}
			if (!mid) return;
			if (animated !== undefined && !selectsMidShot(id, animated, forced))
				return;
			const name = midShotName(id);
			try {
				const shot = await onStory(id, async (page) =>
					animated !== undefined ||
					selectsMidShot(id, await countAnimations(page), forced)
						? shootMid(page, mid)
						: null,
				);
				if (!shot) return;
				writeFileSync(join(out, `${name}.png`), shot.buffer);
				result.shot++;
				result.mid.push(id);
				if (!shot.stable) result.unstable.push(name);
			} catch (e) {
				fail(name, e);
			}
		});
	} finally {
		await browser.close();
	}
	result.mid.sort();
	if (mid)
		writeFileSync(
			join(out, "mid-stories.txt"),
			result.mid.length ? `${result.mid.join("\n")}\n` : "",
		);
	return result;
}
