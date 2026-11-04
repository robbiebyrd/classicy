// Computed-style dump: for every story, `<out>/<id>.json` holds the full
// computed style (every property getComputedStyle lists) of every element
// under #storybook-root, #classicyDesktop and body, with its ::before,
// ::after, ::selection and ::placeholder, plus the focused element
// (`__active`), the root's markup length (`__html`) and where it was taken
// (`__origin`, so the compare can normalize URLs exactly). Same settle as
// `shoot`, with images decoded; dumped until two consecutive dumps agree,
// because layout-dependent used values (auto margins) can lag a frame.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Page } from "playwright";
import {
	launchParityBrowser,
	newStoryPage,
	runPool,
	settleAnimations,
	waitForStoryReady,
} from "./parityBrowser.ts";
import type { ParityOrigin } from "./parityDumpCompare.ts";
import { storyUrl } from "./parityStories.ts";

const dumpPage = (page: Page) =>
	page.evaluate(() => {
		const props = Array.from(getComputedStyle(document.documentElement));
		const o: Record<string, unknown> = {};
		const els = document.querySelectorAll(
			"#storybook-root *, #classicyDesktop *, body > *",
		);
		[...els].forEach((el, i) => {
			for (const ps of [
				null,
				"::before",
				"::after",
				"::selection",
				"::placeholder",
			]) {
				const cs = getComputedStyle(el, ps);
				const v: Record<string, string> = {};
				for (const p of props) v[p] = cs.getPropertyValue(p);
				o[`${i}:${el.tagName}.${[...el.classList].join(".")}${ps || ""}`] = v;
			}
		});
		const ae = document.activeElement as HTMLInputElement | null;
		o.__active = {
			tag: ae?.tagName,
			cls: ae?.className,
			sel: ae && [ae.selectionStart, ae.selectionEnd],
		};
		o.__html = document.querySelector("#storybook-root")?.outerHTML.length ?? 0;
		return o;
	});

export async function dumpStories({
	baseUrl,
	repo,
	out,
	ids,
	workers,
}: {
	baseUrl: string;
	repo: string;
	out: string;
	ids: readonly string[];
	workers: number;
}): Promise<{ dumped: number; errors: string[] }> {
	mkdirSync(out, { recursive: true });
	const origin: ParityOrigin = { baseUrl, repo };
	const browser = await launchParityBrowser("chromium");
	const result = { dumped: 0, errors: [] as string[] };
	try {
		await runPool(ids, workers, async (id) => {
			const { ctx, page } = await newStoryPage(browser);
			try {
				await page.goto(storyUrl(baseUrl, id), {
					waitUntil: "networkidle",
					timeout: 90000,
				});
				await waitForStoryReady(page);
				await settleAnimations(page, true);
				await page.waitForTimeout(500);
				await settleAnimations(page, true);
				let dump = await dumpPage(page);
				let prev = JSON.stringify(dump);
				for (let k = 0; k < 10; k++) {
					await page.waitForTimeout(250);
					await settleAnimations(page, true);
					dump = await dumpPage(page);
					const cur = JSON.stringify(dump);
					if (cur === prev) break;
					prev = cur;
				}
				writeFileSync(
					join(out, `${id}.json`),
					JSON.stringify({ ...dump, __origin: origin }),
				);
				result.dumped++;
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
