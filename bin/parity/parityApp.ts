// Example-app shots: four 1024x768 screens with no Storybook story, reached
// through the real UI of the example dev server, one fresh context each.
//
// The clock is pinned to FIXED through the load, released for the startup
// screen, then pinned at PIN (FIXED + 30.5 s), so the menu-bar clock reads
// 12:00:30 in every shot; the clock's blink animation is switched off. Shots
// repeat until two consecutive frames are identical (an unstable screen is an
// error). Playwright's fake clock replaces `performance` with an object whose
// measureUserAgentSpecificMemory returns no promise, which crashes About This
// Computer, so an init script removes that API; the panel then shows its
// default memory figure, which also keeps the shot deterministic.
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Browser, BrowserContext, Page } from "playwright";
import { launchParityBrowser, PARITY_VIEWPORT } from "./parityBrowser.ts";

const FIXED = new Date("2026-10-30T12:00:00");
const PIN = new Date(FIXED.getTime() + 30500);
const CLOCK = '[data-classicy-part="clock"]';

export const PARITY_APP_SHOTS = [
	"app-about",
	"app-finder-preferences",
	"app-hypercard",
	"app-drive-setup",
] as const;
type AppShot = (typeof PARITY_APP_SHOTS)[number];

async function fresh(browser: Browser, baseUrl: string) {
	const ctx = await browser.newContext({
		viewport: { ...PARITY_VIEWPORT },
		deviceScaleFactor: 1,
	});
	const page = await ctx.newPage();
	await page.clock.install({ time: FIXED });
	await page.clock.setFixedTime(FIXED);
	await page.addInitScript(() => {
		try {
			Object.defineProperty(performance, "measureUserAgentSpecificMemory", {
				value: undefined,
				configurable: true,
			});
		} catch {}
	});
	page.on("pageerror", (e) => console.log("pageerror", e.message));
	page.on("console", (m) => {
		if (m.type() === "error")
			console.log("console.error", m.text().slice(0, 600));
	});
	await page.goto(`${baseUrl}/`, { waitUntil: "load" });
	await page.waitForSelector(".classicyDesktopMenuBar", { timeout: 90000 });
	await page.waitForSelector(CLOCK, { timeout: 90000 });
	await page.evaluate((sel) => {
		(window as unknown as { __parityClock: Element | null }).__parityClock =
			document.querySelector(sel);
	}, CLOCK);
	await page.clock.setSystemTime(FIXED);
	await page.waitForFunction(
		() => !document.querySelector("[class*=Startup]"),
		null,
		{ timeout: 90000 },
	);
	const now = await page.evaluate(() => Date.now());
	if (now >= PIN.getTime())
		throw new Error(`startup ran past PIN (${now - FIXED.getTime()} ms)`);
	await page.clock.setFixedTime(PIN);
	await page.evaluate(() => document.fonts.ready);
	await page.waitForTimeout(1500);
	return { ctx, page };
}

async function checkClock(page: Page) {
	const clock = await page.evaluate((sel) => {
		const el = document.querySelector(sel);
		return {
			same:
				el ===
				(window as unknown as { __parityClock: Element | null }).__parityClock,
			text: el?.textContent?.replace(/\s+/g, " ").trim(),
		};
	}, CLOCK);
	if (!clock.same) throw new Error("clock widget remounted after load");
	if (!/12:00:30/.test(clock.text || ""))
		throw new Error(`unexpected clock text: ${clock.text}`);
}

async function park(page: Page) {
	await page.mouse.move(1010, 700);
	await page.waitForTimeout(1200);
}

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

async function appleMenu(page: Page, itemText: string) {
	await page
		.locator('.classicyDesktopMenuBar [data-classicy-part="apple"]')
		.first()
		.click();
	await page.waitForTimeout(400);
	await page
		.locator('[data-classicy-part="apple"] li.classicyMenuItem', {
			hasText: new RegExp(`^${escapeRegExp(itemText)}$`),
		})
		.first()
		.click();
	await page.waitForSelector(".classicyWindow.active", { timeout: 15000 });
	await park(page);
}

async function appMenu(page: Page, top: string, item: RegExp) {
	await page
		.locator('.classicyDesktopMenuBar [data-classicy-part="app"]')
		.filter({ hasText: new RegExp(`^${escapeRegExp(top)}`) })
		.first()
		.click();
	await page.waitForTimeout(400);
	await page
		.locator(
			'.classicyDesktopMenuBar [data-classicy-part="app"] li.classicyMenuItem',
		)
		.filter({ hasText: item })
		.first()
		.click();
	await page.waitForTimeout(1500);
}

const activeTitle = (page: Page) =>
	page.evaluate(() =>
		document
			.querySelector(".classicyWindow.active .classicyWindowTitle")
			?.textContent?.trim(),
	);

async function expectActive(page: Page, title: RegExp) {
	const t = await activeTitle(page);
	if (!title.test(t || ""))
		throw new Error(`the active window is ${t}, not ${title}`);
}

async function openInFinder(page: Page, label: string) {
	await page
		.locator(
			".classicyWindow.active .classicyFileBrowserViewTableRowIconLabel",
			{
				hasText: new RegExp(`^${escapeRegExp(label)}$`),
			},
		)
		.dblclick();
	await page.waitForTimeout(1200);
}

async function stableShot(page: Page, file: string) {
	await checkClock(page);
	await page.evaluate(() => {
		if (document.getElementById("parity-no-blink")) return;
		const style = document.createElement("style");
		style.id = "parity-no-blink";
		style.textContent =
			'[data-classicy-part="clock"] * { animation: none !important; }';
		document.head.appendChild(style);
	});
	const blink = await page.evaluate(() =>
		[...document.querySelectorAll('[data-classicy-part="clock"] *')].map(
			(e) => [getComputedStyle(e).opacity, e.getAnimations().length] as const,
		),
	);
	if (blink.some(([o, n]) => o !== "1" || n !== 0))
		throw new Error(`clock still animating: ${JSON.stringify(blink)}`);
	let prev: string | null = null;
	for (let i = 0; i < 8; i++) {
		const buf = await page.screenshot();
		const h = createHash("sha256").update(buf).digest("hex");
		if (h === prev) {
			writeFileSync(file, buf);
			console.log("shot", file, `stable after ${i + 1}`);
			return;
		}
		prev = h;
		await page.waitForTimeout(400);
	}
	throw new Error(`unstable: ${file}`);
}

/** How each screen is reached, from a freshly loaded desktop. */
const REACH: Record<AppShot, (page: Page) => Promise<void>> = {
	// Apple menu > About This Computer.
	"app-about": async (page) => {
		await appleMenu(page, "About This Computer");
		await expectActive(page, /About This Computer/);
	},
	// Open Macintosh HD (Finder's Edit menu only carries Preferences once a
	// Finder window is open), then Edit > Preferences...
	"app-finder-preferences": async (page) => {
		await page
			.locator(".classicyDesktopIcon", { hasText: "Macintosh HD" })
			.dblclick();
		await page.waitForTimeout(1200);
		await appMenu(page, "Edit", /^Preferences/);
		await park(page);
		await expectActive(page, /Preferences/);
	},
	// Macintosh HD > Applications > HyperCard; Examples > Open "Plugin Demo";
	// File > Edit Stack (pointer tool); click the editor hit box of part
	// `bang` (the "Append !" button): one selection with eight handles.
	"app-hypercard": async (page) => {
		await page
			.locator(".classicyDesktopIcon", { hasText: "Macintosh HD" })
			.dblclick();
		await page.waitForTimeout(1200);
		await openInFinder(page, "Applications");
		await openInFinder(page, "HyperCard");
		await page.waitForTimeout(800);
		await appMenu(page, "Examples", /Plugin Demo/);
		await appMenu(page, "File", /^Edit Stack$/);
		await page
			.locator('.classicyHyperCardEditorHit[data-part-id="bang"]')
			.first()
			.click();
		await park(page);
		const sel = await page.evaluate(() => ({
			selections: document.querySelectorAll(".classicyHyperCardEditorSelection")
				.length,
			handles: document.querySelectorAll(".classicyHyperCardEditorHandle")
				.length,
		}));
		if (sel.selections !== 1 || sel.handles !== 8)
			throw new Error(`hypercard selection: ${JSON.stringify(sel)}`);
	},
	// Apple menu > Drive Setup.
	"app-drive-setup": async (page) => {
		await appleMenu(page, "Drive Setup");
		await expectActive(page, /Drive Setup/);
	},
};

export async function shootApp({
	baseUrl,
	out,
	filter,
}: {
	baseUrl: string;
	out: string;
	filter?: RegExp;
}): Promise<{ shot: string[]; failed: string[] }> {
	mkdirSync(out, { recursive: true });
	const browser = await launchParityBrowser();
	const result = { shot: [] as string[], failed: [] as string[] };
	try {
		for (const name of PARITY_APP_SHOTS) {
			if (filter && !filter.test(name)) continue;
			let opened: { ctx: BrowserContext; page: Page } | undefined;
			try {
				opened = await fresh(browser, baseUrl);
				await REACH[name](opened.page);
				await stableShot(opened.page, join(out, `${name}.png`));
				result.shot.push(name);
			} catch (e) {
				result.failed.push(name);
				console.error(`ERROR ${name} ${String(e).split("\n")[0]}`);
				await opened?.page
					.screenshot({ path: join(out, `fail-${name}.png`) })
					.catch(() => {});
			} finally {
				await opened?.ctx.close();
			}
		}
	} finally {
		await browser.close();
	}
	return result;
}
