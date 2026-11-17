// Browser check: every first-level menu of a story's menu bars (the screen
// bar's and each window's own), opened in turn, lies fully inside the
// desktop, its frame's shadow included (owner report 2026-11-17, plan
// 0018-dbd Batch O: System 7's Help menu opened off the screen's right
// edge). Run it against a served static Storybook build, as the parity
// tools are (bin/parity/README.md):
//
//   node bin/check-menus-on-desktop.ts --port <n> [storyId ...]
//
// With no story ids it checks the System 7 and Platinum desktop stories.
// It measures as a browser paints: each open menu list's border box, its
// outer box-shadow and its absolutely placed ::before/::after (every
// package's frame shadow), against `.classicyDesktop`'s box. Independent of
// the core's own measurement (ClassicyMenuPlacement.internal.ts), so it
// checks the result, not the code's arithmetic.
//
// Exit codes: 0 when every menu lies inside, 1 when one does not (or a story
// has no menu to open), 2 on a usage or environment error. Build script, not
// library code: it reports through stdout/stderr. Erasable TypeScript only.
import {
	launchParityBrowser,
	newStoryPage,
	waitForStoryReady,
} from "./parity/parityBrowser.ts";
import { storyUrl } from "./parity/parityStories.ts";

const DEFAULT_STORIES = [
	"appearance-system-7-desktop--desktop",
	"appearance-system-7-desktop--desktop-color",
	"desktop-desktop--default",
];

/** A title with a menu, on any bar (screen or window), balloon-wrapped or not. */
const TITLE_SELECTOR = [
	".classicyDesktopMenu > .classicyMenuItem.classicyMenuItemChildMenuIndicator",
	".classicyDesktopMenu > .classicyMenuItemBalloonAnchor > .classicyMenuItem.classicyMenuItemChildMenuIndicator",
].join(", ");

type Measured = {
	title: string;
	ink: [number, number, number, number];
	desktop: [number, number, number, number];
	inside: boolean;
};

const args = process.argv.slice(2);
const portAt = args.indexOf("--port");
if (portAt === -1 || !args[portAt + 1]) {
	process.stderr.write(
		"usage: node bin/check-menus-on-desktop.ts --port <n> [storyId ...]\n",
	);
	process.exit(2);
}
const port = args[portAt + 1];
const ids = args.filter((_, i) => i !== portAt && i !== portAt + 1);
const stories = ids.length > 0 ? ids : DEFAULT_STORIES;
const baseUrl = `http://127.0.0.1:${port}`;

let browser: Awaited<ReturnType<typeof launchParityBrowser>>;
try {
	browser = await launchParityBrowser();
} catch (e) {
	process.stderr.write(`${String(e)}\n`);
	process.exit(2);
}

let failed = false;
for (const id of stories) {
	const { ctx, page } = await newStoryPage(browser);
	try {
		await page.goto(storyUrl(baseUrl, id), {
			waitUntil: "load",
			timeout: 90000,
		});
		await waitForStoryReady(page);
		const count = await page.evaluate(
			(selector) => document.querySelectorAll(selector).length,
			TITLE_SELECTOR,
		);
		if (count === 0) {
			process.stdout.write(`FAIL ${id}: no menu-bar title with a menu\n`);
			failed = true;
		}
		for (let i = 0; i < count; i++) {
			const result: Measured | null = await page.evaluate(
				async ({ selector, index }) => {
					const frame = () =>
						new Promise<void>((r) =>
							requestAnimationFrame(() => requestAnimationFrame(() => r())),
						);
					const title = document.querySelectorAll<HTMLElement>(selector)[index];
					title.click();
					await frame();
					const list = title.querySelector<HTMLElement>(
						":scope > .classicyMenuWrapper > ul",
					);
					if (!list || !title.classList.contains("open")) return null;
					const px = (v: string) => Number.parseFloat(v) || 0;
					const r = list.getBoundingClientRect();
					const s = getComputedStyle(list);
					let [left, top, right, bottom] = [r.left, r.top, r.right, r.bottom];
					// Outer box-shadows (Platinum's pop-up lists draw theirs so).
					for (const shadow of s.boxShadow === "none"
						? []
						: s.boxShadow.split(/,(?![^(]*\))/)) {
						if (/\binset\b/.test(shadow)) continue;
						const [x = 0, y = 0, blur = 0, spread = 0] = shadow
							.replace(/[a-z-]+\([^)]*\)/gi, " ")
							.split(/\s+/)
							.filter((t) => /^-?[\d.]+(px)?$/.test(t))
							.map(Number.parseFloat);
						const out = Math.max(blur, 0) + spread;
						left = Math.min(left, r.left + x - out);
						right = Math.max(right, r.right + x + out);
						top = Math.min(top, r.top + y - out);
						bottom = Math.max(bottom, r.bottom + y + out);
					}
					// Absolutely placed pseudo-elements, from the padding box.
					const pad = {
						left: r.left + px(s.borderLeftWidth),
						top: r.top + px(s.borderTopWidth),
					};
					for (const which of ["::before", "::after"]) {
						const p = getComputedStyle(list, which);
						if (
							p.content === "none" ||
							p.display === "none" ||
							p.position !== "absolute"
						)
							continue;
						const l = pad.left + px(p.left);
						const t = pad.top + px(p.top);
						left = Math.min(left, l);
						top = Math.min(top, t);
						right = Math.max(right, l + px(p.width));
						bottom = Math.max(bottom, t + px(p.height));
					}
					const desktop = (
						title.closest(".classicyDesktop") as HTMLElement
					).getBoundingClientRect();
					const inside =
						left >= desktop.left - 0.01 &&
						right <= desktop.right + 0.01 &&
						top >= desktop.top - 0.01 &&
						bottom <= desktop.bottom + 0.01;
					const name =
						title.id ||
						title.querySelector("p")?.textContent?.trim() ||
						String(index);
					// Close it again: a click on its open title.
					title.click();
					await frame();
					return {
						title: name,
						ink: [left, top, right, bottom],
						desktop: [desktop.left, desktop.top, desktop.right, desktop.bottom],
						inside,
					};
				},
				{ selector: TITLE_SELECTOR, index: i },
			);
			if (!result) {
				process.stdout.write(`FAIL ${id} #${i}: the menu did not open\n`);
				failed = true;
				continue;
			}
			const verdict = result.inside ? "ok  " : "FAIL";
			if (!result.inside) failed = true;
			process.stdout.write(
				`${verdict} ${id} ${result.title}: menu ${result.ink.map((n) => Math.round(n * 100) / 100).join(",")} in desktop ${result.desktop.join(",")}\n`,
			);
		}
	} finally {
		await ctx.close();
	}
}
await browser.close();
process.exit(failed ? 1 : 0);
