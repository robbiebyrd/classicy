// Render probe: load every story the way `shoot` does and flag the ones that
// end in Storybook's error display, with an empty or zero-height
// #storybook-root, or on a Classicy crash screen (outside the crash-screen
// stories). Two shoots of a broken story match at AE 0, so run this on a new
// baseline before trusting it.
import {
	launchParityBrowser,
	newStoryPage,
	runPool,
	waitForStoryReady,
} from "./parityBrowser.ts";
import { storyUrl } from "./parityStories.ts";

export async function probeStories({
	baseUrl,
	ids,
	workers,
}: {
	baseUrl: string;
	ids: readonly string[];
	workers: number;
}): Promise<string[]> {
	const browser = await launchParityBrowser("chromium");
	const flagged: string[] = [];
	try {
		await runPool(ids, workers, async (id) => {
			const { ctx, page } = await newStoryPage(browser);
			try {
				await page.goto(storyUrl(baseUrl, id), {
					waitUntil: "networkidle",
					timeout: 90000,
				});
				await waitForStoryReady(page);
				const s = await page.evaluate(() => {
					const root = document.querySelector("#storybook-root");
					return {
						error: document.body.classList.contains("sb-show-errordisplay"),
						rootKids: root?.children.length ?? 0,
						rootH: root?.getBoundingClientRect().height ?? 0,
						crash:
							!!document.querySelector(
								"[class*=CrashScreen], [class*=crashScreen]",
							) && !location.search.includes("crashscreen"),
					};
				});
				if (s.error || s.rootKids === 0 || s.rootH < 2 || s.crash)
					flagged.push(`FLAG ${id} ${JSON.stringify(s)}`);
			} catch (e) {
				flagged.push(`FLAG ${id} LOAD-ERROR ${String(e).slice(0, 120)}`);
			} finally {
				await ctx.close();
			}
		});
	} finally {
		await browser.close();
	}
	return flagged.sort();
}
