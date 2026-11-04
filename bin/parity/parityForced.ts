// Forced-state dumps. Chromium: each PARITY_FORCED_STATES entry loads its
// story, applies its ops, settles, and dumps the computed style of the target,
// every descendant and their ::before/::after (and ::-webkit-scrollbar where
// it scrolls), plus `__matchedPseudo`: the matched rules of the slider and
// scrollbar pseudo-elements read through CDP, since getComputedStyle cannot
// read them in Chromium. Firefox (no CDP, so no forced pseudo-classes): the
// PARITY_FIREFOX_CASES reads. Output: `<out>/<story>__<state>.json`.
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser } from "playwright";
import {
	launchParityBrowser,
	newStoryPage,
	settleAnimations,
	waitForStoryReady,
} from "./parityBrowser.ts";
import type { ParityOrigin } from "./parityDumpCompare.ts";
import {
	PARITY_FIREFOX_CASES,
	PARITY_FORCED_STATES,
	type ParityForcedState,
} from "./parityForcedMatrix.ts";
import { storyUrl } from "./parityStories.ts";

type Outcome = { ok: string[]; failed: string[] };

async function forcedChromium(
	browser: Browser,
	m: ParityForcedState,
	baseUrl: string,
): Promise<Record<string, unknown>> {
	const { ctx, page } = await newStoryPage(browser);
	try {
		await page.goto(storyUrl(baseUrl, m.story), {
			waitUntil: "networkidle",
			timeout: 90000,
		});
		await waitForStoryReady(page);
		const cdp = await ctx.newCDPSession(page);
		await cdp.send("DOM.enable");
		await cdp.send("CSS.enable");
		const { root } = await cdp.send("DOM.getDocument", { depth: 0 });
		for (const op of m.ops) {
			if (op.click) {
				await page.click(op.click);
				await page.waitForTimeout(300);
				continue;
			}
			if (op.sel && (op.add || op.remove || op.set))
				await page.evaluate(
					({ sel, add, remove, set, optional }) => {
						const el = document.querySelector(sel);
						if (!el) {
							if (optional) return;
							throw new Error(`missing ${sel}`);
						}
						for (const c of remove ?? []) el.classList.remove(c);
						for (const c of add ?? []) el.classList.add(c);
						Object.assign(el, set ?? {});
					},
					{
						sel: op.sel,
						add: op.add,
						remove: op.remove,
						set: op.set,
						optional: op.optional,
					},
				);
			if (op.sel && op.force) {
				const { nodeId } = await cdp.send("DOM.querySelector", {
					nodeId: root.nodeId,
					selector: op.sel,
				});
				if (!nodeId) throw new Error(`missing ${op.sel}`);
				await cdp.send("CSS.forcePseudoState", {
					nodeId,
					forcedPseudoClasses: op.force,
				});
			}
		}
		await settleAnimations(page);
		await page.waitForTimeout(400);
		await settleAnimations(page);
		const res: Record<string, unknown> = await page.evaluate((target) => {
			const props = Array.from(getComputedStyle(document.documentElement));
			const rootEl = document.querySelector(target);
			if (!rootEl) throw new Error(`no target ${target}`);
			const scrollbar: Record<string, string> = {};
			const o: Record<string, unknown> = {
				__target: target,
				__found: true,
				__scrollbar: scrollbar,
			};
			[rootEl, ...rootEl.querySelectorAll("*")].forEach((el, i) => {
				for (const ps of [null, "::before", "::after", "::-webkit-scrollbar"]) {
					if (
						ps?.startsWith("::-webkit-") &&
						!(
							el.classList.contains("classicyTabScroller") ||
							el.scrollWidth > el.clientWidth
						)
					)
						continue;
					const cs = getComputedStyle(el, ps);
					const v: Record<string, string> = {};
					for (const p of props) v[p] = cs.getPropertyValue(p);
					if (ps && Object.values(v).every((x) => x === "")) {
						scrollbar[`${i}:${ps}`] = "unreadable";
						continue;
					}
					o[`${i}:${el.tagName}.${[...el.classList].join(".")}${ps || ""}`] = v;
				}
				if (el.classList.contains("classicyTabScroller"))
					scrollbar[`${i}:scrollbar-width`] =
						getComputedStyle(el).scrollbarWidth;
			});
			return o;
		}, m.target);
		const { root: r2 } = await cdp.send("DOM.getDocument", { depth: 0 });
		const ids: number[] = [];
		const first = await cdp.send("DOM.querySelector", {
			nodeId: r2.nodeId,
			selector: m.target,
		});
		if (first.nodeId) ids.push(first.nodeId);
		const inputs = await cdp.send("DOM.querySelectorAll", {
			nodeId: r2.nodeId,
			selector: `${m.target} input, ${m.target} .classicyTabScroller`,
		});
		ids.push(...inputs.nodeIds);
		const matched: Record<string, unknown[]> = {};
		let ni = 0;
		for (const nodeId of [...new Set(ids)]) {
			const ms = await cdp.send("CSS.getMatchedStylesForNode", { nodeId });
			const attrs = (await cdp.send("DOM.getAttributes", { nodeId }))
				.attributes;
			const key = `${ni++}:${attrs[attrs.indexOf("class") + 1] || ""}`;
			const list: unknown[] = [];
			for (const pe of ms.pseudoElements ?? [])
				for (const mt of pe.matches)
					list.push({
						pseudo: pe.pseudoType + (pe.pseudoIdentifier || ""),
						selector: mt.rule.selectorList.text,
						origin: mt.rule.origin,
						layers: (mt.rule.layers ?? []).map((l) => l.text),
						props: mt.rule.style.cssProperties
							.filter((p) => p.range || p.value)
							.map(
								(p) =>
									`${p.name}:${p.value}${p.important ? " !important" : ""}`,
							),
					});
			if (list.length) matched[key] = list;
		}
		res.__matchedPseudo = matched;
		return res;
	} finally {
		await ctx.close();
	}
}

async function forcedFirefox(
	browser: Browser,
	story: string,
	selector: string,
	baseUrl: string,
): Promise<Record<string, unknown>> {
	const { ctx, page } = await newStoryPage(browser);
	try {
		await page.goto(storyUrl(baseUrl, story), {
			waitUntil: "networkidle",
			timeout: 90000,
		});
		await waitForStoryReady(page);
		await page.waitForTimeout(400);
		return await page.evaluate((sel) => {
			const o: Record<string, unknown> = {};
			const props = Array.from(getComputedStyle(document.documentElement));
			document.querySelectorAll(sel).forEach((el, i) => {
				for (const ps of [
					null,
					"::-moz-range-thumb",
					"::-moz-range-track",
					"::-moz-range-progress",
				]) {
					const cs = getComputedStyle(el, ps);
					const v: Record<string, string> = {};
					for (const p of props) v[p] = cs.getPropertyValue(p);
					o[`${i}:${el.className}${ps || ""}`] = v;
				}
				o[`${i}:scrollbar-width`] = getComputedStyle(el).scrollbarWidth;
			});
			return o;
		}, selector);
	} finally {
		await ctx.close();
	}
}

export async function dumpForcedStates({
	baseUrl,
	repo,
	out,
	filter,
	browser: kind,
}: {
	baseUrl: string;
	repo: string;
	out: string;
	filter?: RegExp;
	browser: "chromium" | "firefox";
}): Promise<Outcome> {
	mkdirSync(out, { recursive: true });
	const origin: ParityOrigin = { baseUrl, repo };
	const browser = await launchParityBrowser(kind);
	const outcome: Outcome = { ok: [], failed: [] };
	const write = (name: string, data: Record<string, unknown>) =>
		writeFileSync(
			join(out, `${name}.json`),
			JSON.stringify({ ...data, __origin: origin }, null, 1),
		);
	try {
		const jobs =
			kind === "firefox"
				? PARITY_FIREFOX_CASES.map(([story, sel]) => ({
						name: `${story}__firefox`,
						run: () => forcedFirefox(browser, story, sel, baseUrl),
					}))
				: PARITY_FORCED_STATES.map((m) => ({
						name: `${m.story}__${m.state}`,
						run: () => forcedChromium(browser, m, baseUrl),
					}));
		for (const job of jobs) {
			if (filter && !filter.test(job.name)) continue;
			try {
				write(job.name, await job.run());
				outcome.ok.push(job.name);
			} catch (e) {
				outcome.failed.push(job.name);
				console.error(`FAIL ${job.name} ${String(e).slice(0, 160)}`);
			}
		}
	} finally {
		await browser.close();
	}
	return outcome;
}
