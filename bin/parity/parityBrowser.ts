// Shared browser setup for the parity tools: the Playwright module, the
// deterministic Chromium launch, Storybook's readiness wait, the animation
// settle and the "two identical frames" screenshot.
import { createRequire } from "node:module";
import type { Browser, BrowserContext, Page } from "playwright";

type Playwright = typeof import("playwright");

/**
 * Chromium flags for pixel-exact screenshots. Without them about 7% of fresh
 * contexts rasterize some text or edges 1 px differently (half-pixel offsets
 * land on either side): GPU compositing, subpixel (LCD) text antialiasing and
 * partial raster each make a frame depend on timing and tiling.
 */
export const PARITY_CHROMIUM_ARGS = [
	"--disable-gpu",
	"--disable-lcd-text",
	"--disable-partial-raster",
] as const;

export const PARITY_VIEWPORT = { width: 1024, height: 768 } as const;

/** The Date every story is shot at, so clocks and dates never differ. */
export const PARITY_STORY_TIME = new Date("2026-01-01T09:41:00");

const requireFromHere = createRequire(import.meta.url);

/** Playwright from the workspace devDependencies, or `$PARITY_PLAYWRIGHT` (a
 * module name or a path to a Playwright package directory). */
export async function loadPlaywright(
	env: Readonly<Record<string, string | undefined>> = process.env,
	importer: (specifier: string) => Promise<unknown> = async (s) =>
		requireFromHere(s),
): Promise<Playwright> {
	const specifier = env.PARITY_PLAYWRIGHT || "playwright";
	try {
		return (await importer(specifier)) as Playwright;
	} catch (e) {
		throw new Error(
			`cannot load Playwright from "${specifier}" (${String(e).split("\n")[0]}). ` +
				"It is a devDependency of the workspace root: run `pnpm install`, " +
				"or point $PARITY_PLAYWRIGHT at a Playwright package directory.",
		);
	}
}

export async function launchParityBrowser(): Promise<Browser> {
	const pw = await loadPlaywright();
	try {
		return await pw.chromium.launch({ args: [...PARITY_CHROMIUM_ARGS] });
	} catch (e) {
		throw new Error(
			`Playwright could not launch chromium: ${String(e).split("\n")[0]}\n` +
				"Install its browser with `pnpm exec playwright install chromium`.",
		);
	}
}

/** A fresh context (empty storage) and page at 1024x768 with the clock pinned. */
export async function newStoryPage(
	browser: Browser,
): Promise<{ ctx: BrowserContext; page: Page }> {
	const ctx = await browser.newContext({ viewport: { ...PARITY_VIEWPORT } });
	const page = await ctx.newPage();
	await page.clock.setFixedTime(PARITY_STORY_TIME);
	return { ctx, page };
}

/** Wait until Storybook has finished loading (no preparing overlays),
 * #storybook-root has rendered, fonts are loaded and the element count has
 * held still for five 100 ms polls. */
export async function waitForStoryReady(page: Page): Promise<void> {
	await page.waitForFunction(
		() => {
			const body = document.body;
			if (
				body.classList.contains("sb-show-preparing-story") ||
				body.classList.contains("sb-show-preparing-docs")
			)
				return false;
			if (
				!body.classList.contains("sb-show-main") &&
				!body.classList.contains("sb-show-errordisplay")
			)
				return false;
			const root = document.querySelector("#storybook-root");
			return !!root && root.children.length > 0;
		},
		null,
		{ timeout: 60000 },
	);
	await page.evaluate(() => document.fonts.ready);
	let last = -1;
	let stable = 0;
	for (let i = 0; i < 60 && stable < 5; i++) {
		const n = await page.evaluate(() => document.querySelectorAll("*").length);
		stable = n === last ? stable + 1 : 0;
		last = n;
		await page.waitForTimeout(100);
	}
}

/** Finish CSS transitions and park every other animation at t=0, twice,
 * a frame apart. With `images`, first wait for every image to decode. */
export async function settleAnimations(
	page: Page,
	images = false,
): Promise<void> {
	await page.evaluate(async (decode) => {
		if (decode)
			await Promise.all(
				[...document.images].map((i) =>
					i.complete
						? i.decode().catch(() => {})
						: new Promise((r) => {
								i.onload = i.onerror = r;
							}),
				),
			);
		for (let i = 0; i < 2; i++) {
			for (const a of document.getAnimations()) {
				try {
					if (a.constructor.name === "CSSTransition") a.finish();
					else {
						a.pause();
						a.currentTime = 0;
					}
				} catch {}
			}
			await new Promise<void>((r) => requestAnimationFrame(() => r()));
		}
	}, images);
}

type Shooter = {
	screenshot: (options?: { animations?: "disabled" }) => Promise<Buffer>;
	waitForTimeout: (ms: number) => Promise<void>;
};

/** Shoot until two consecutive frames are byte-identical (raster can lag a
 * frame under load), at most `attempts` times. Returns the last frame. */
export async function shootUntilStable(
	page: Shooter,
	{
		attempts = 8,
		interval = 150,
		animations,
	}: { attempts?: number; interval?: number; animations?: "disabled" } = {},
): Promise<{ buffer: Buffer; stable: boolean; shots: number }> {
	let prev: Buffer | null = null;
	let buffer: Buffer = Buffer.alloc(0);
	for (let k = 1; k <= attempts; k++) {
		buffer = await page.screenshot(animations ? { animations } : undefined);
		if (prev?.equals(buffer)) return { buffer, stable: true, shots: k };
		prev = buffer;
		if (k < attempts) await page.waitForTimeout(interval);
	}
	return { buffer, stable: false, shots: attempts };
}

/** Run `fn` over `items` with at most `workers` in flight. */
export async function runPool<T>(
	items: readonly T[],
	workers: number,
	fn: (item: T) => Promise<void>,
): Promise<void> {
	let next = 0;
	const work = async () => {
		while (next < items.length) await fn(items[next++]);
	};
	await Promise.all(
		Array.from({ length: Math.min(workers, items.length) }, work),
	);
}
