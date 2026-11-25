// Browser check: the Application Switcher's palette counts its lines as the
// browser lays it out (integration review G round 2, F1 to F4; the unit
// tests in ClassicyApplicationSwitcher.test.tsx run on a layout model, since
// jsdom lays nothing out, so a window's computed `max-height`, the size of a
// button's copy and what the window clips are browser facts). Run it against
// a served static Storybook build, as the parity tools are
// (bin/parity/README.md):
//
//   node bin/check-app-switcher-palette.ts --port <n> [--browser chromium|firefox] [storyId]
//
// The story defaults to `desktop-application-switcher--many-applications`
// (eight applications, large icons). `--browser firefox` needs a Playwright
// with Firefox installed: point `$PARITY_PLAYWRIGHT` at one that has it
// (bin/parity/parityBrowser.ts). Under Platinum it lays the palette down a
// column and across a row, with large and small icons, on desktops of
// several sizes, and at each checks that:
//
// - the palette settles: one size and one line count over 30 frames, with
//   no hidden copy of its list built meanwhile;
// - nothing is cut: no button, and no part of the list with its margin,
//   passes the window's padding box, and the window is no taller than its
//   maximum height as the browser resolves it;
// - the count is the desktop's capacity: the line fits the room (the
//   desktop's width; its height under the menu bar, and no more than the
//   window's maximum height), and one more button a line would not;
// - the copy the count read was hidden, out of the flow and unwrapped, and
//   each button's copy was as large along the line as that button laid out
//   alone.
//
// Then it drags the wrapped palette partly past the desktop's right edge
// (its shape must not change), and under System 7 checks that no palette is
// drawn.
//
// Exit codes: 0 when every check passes, 1 when one fails, 2 on a usage or
// environment error. Build script, not library code: it reports through
// stdout/stderr. Erasable TypeScript only.
import type { Page } from "playwright";
import {
	launchParityBrowser,
	loadPlaywright,
	newStoryPage,
	waitForStoryReady,
} from "./parity/parityBrowser.ts";
import { storyUrl } from "./parity/parityStories.ts";

const DEFAULT_STORY = "desktop-application-switcher--many-applications";
const PALETTE = ".classicyApplicationSwitcherPalette";

const usage = () => {
	process.stderr.write(
		"usage: node bin/check-app-switcher-palette.ts --port <n> [--browser chromium|firefox] [storyId]\n",
	);
	process.exit(2);
};

const args = process.argv.slice(2);
const option = (name: string) => {
	const at = args.indexOf(name);
	if (at === -1) return undefined;
	const value = args[at + 1];
	if (!value) usage();
	args.splice(at, 2);
	return value;
};
const port = option("--port");
const browserName = option("--browser") ?? "chromium";
if (!port || (browserName !== "chromium" && browserName !== "firefox")) usage();
const story = args[0] ?? DEFAULT_STORY;
const baseUrl = `http://127.0.0.1:${port}`;

// An environment error (exit 2): one line to stderr, no stack trace.
const environmentError = (message: string): never => {
	process.stderr.write(`check-app-switcher-palette: ${message}\n`);
	process.exit(2);
};

/**
 * Records each hidden copy of the palette's list while it is in the
 * document (the count removes it in the same call, so no observer sees it
 * laid out): `Element.prototype.after` is how the copy goes in.
 */
const recordCopies = () => {
	const copies: unknown[] = [];
	(window as unknown as { __paletteCopies: unknown[] }).__paletteCopies =
		copies;
	const after = Element.prototype.after;
	Element.prototype.after = function (...nodes: (Node | string)[]) {
		after.apply(this, nodes);
		for (const node of nodes) {
			if (
				!(node instanceof HTMLElement) ||
				!node.classList.contains("classicyApplicationSwitcherButtons")
			)
				continue;
			const style = getComputedStyle(node);
			copies.push({
				wrapped: node.classList.contains("classicyApplicationSwitcherWrapped"),
				lines: node.style.getPropertyValue("--application-switcher-lines"),
				position: style.position,
				visibility: style.visibility,
				ariaHidden: node.getAttribute("aria-hidden"),
				inert: node.inert === true,
				horizontal: !!node.closest(".classicyApplicationSwitcherHorizontal"),
				sizes: Array.from(node.children, (copy) => {
					const box = copy.getBoundingClientRect();
					return [box.width, box.height];
				}),
			});
		}
	};
};

type Copy = {
	wrapped: boolean;
	lines: string;
	position: string;
	visibility: string;
	ariaHidden: string | null;
	inert: boolean;
	horizontal: boolean;
	sizes: [number, number][];
};

type Geometry = {
	horizontal: boolean;
	/** The palette's size along a line of buttons, and across. */
	along: number;
	across: number;
	count: number;
	/** Buttons a line, as the palette set it; the count when unwrapped. */
	perLine: number;
	/** How far the worst button, and the list with its margin, pass the
	 * window's padding box (0 or less: inside). */
	buttonPast: number;
	listPast: number;
	/** The room a line has: the desktop's, and the window's maximum height
	 * as the browser resolves it. */
	room: number;
	maxHeight: number;
	height: number;
	gap: number;
	/** Each button's size along the line, laid out alone. */
	alone: number[];
	copies: Copy[];
};

const measure = (page: Page): Promise<Geometry | undefined> =>
	page.evaluate((selector) => {
		const palette = document.querySelector<HTMLElement>(selector);
		const list = palette?.querySelector<HTMLElement>(
			".classicyApplicationSwitcherButtons",
		);
		const layer = palette?.parentElement;
		if (!palette || !list || !layer) return undefined;
		const px = (value: string) => Number.parseFloat(value) || 0;
		const horizontal = palette.classList.contains(
			"classicyApplicationSwitcherHorizontal",
		);
		const style = getComputedStyle(palette);
		const box = palette.getBoundingClientRect();
		const padding = {
			top: box.top + px(style.borderTopWidth),
			left: box.left + px(style.borderLeftWidth),
			bottom: box.bottom - px(style.borderBottomWidth),
			right: box.right - px(style.borderRightWidth),
		};
		const past = (r: DOMRect, margin = 0) =>
			Math.max(
				r.bottom + margin - padding.bottom,
				r.right + margin - padding.right,
				padding.top - (r.top - margin),
				padding.left - (r.left - margin),
			);
		const buttons = Array.from(list.children) as HTMLElement[];
		const listStyle = getComputedStyle(list);
		// The window's maximum height, resolved by the browser: an element as
		// tall as the computed value, in the window's containing block.
		const probe = document.createElement("div");
		probe.style.cssText = `position:absolute;visibility:hidden;width:0;height:${style.maxHeight}`;
		layer.append(probe);
		const limit = probe.getBoundingClientRect().height;
		probe.remove();
		const maxHeight =
			style.maxHeight === "none"
				? Number.POSITIVE_INFINITY
				: limit +
					(style.boxSizing === "border-box"
						? 0
						: px(style.paddingTop) +
							px(style.paddingBottom) +
							px(style.borderTopWidth) +
							px(style.borderBottomWidth));
		const desktop = layer.getBoundingClientRect();
		const menuBar = px(
			getComputedStyle(layer).getPropertyValue("--menu-bar-height"),
		);
		// Each button alone, in an unwrapped line as large as its content.
		const alone = buttons.map((button) => {
			const line = list.cloneNode(false) as HTMLElement;
			line.classList.remove("classicyApplicationSwitcherWrapped");
			line.removeAttribute("style");
			line.style.cssText =
				"position:absolute;left:0;top:0;width:max-content;height:auto;visibility:hidden";
			line.append(button.cloneNode(true));
			list.parentElement?.append(line);
			const size = (
				line.firstElementChild as HTMLElement
			).getBoundingClientRect();
			line.remove();
			return horizontal ? size.width : size.height;
		});
		const set = Number.parseInt(
			list.style.getPropertyValue("--application-switcher-lines"),
			10,
		);
		return {
			horizontal,
			along: horizontal ? box.width : box.height,
			across: horizontal ? box.height : box.width,
			count: buttons.length,
			perLine: set > 0 ? set : buttons.length,
			buttonPast: Math.max(
				...buttons.map((button) => past(button.getBoundingClientRect())),
			),
			listPast: past(
				list.getBoundingClientRect(),
				px(horizontal ? listStyle.marginBottom : listStyle.marginRight),
			),
			room: horizontal
				? desktop.width
				: Math.min(desktop.height - menuBar, maxHeight),
			maxHeight,
			height: box.height,
			gap: px(horizontal ? listStyle.columnGap : listStyle.rowGap),
			alone,
			copies: (window as unknown as { __paletteCopies: Copy[] })
				.__paletteCopies,
		};
	}, PALETTE);

/** The extent of `sizes` in lines of `n`: each track its largest button. */
const extent = (sizes: number[], n: number, gap: number) => {
	const tracks = Math.min(n, sizes.length);
	let total = gap * Math.max(0, tracks - 1);
	for (let track = 0; track < tracks; track++) {
		let largest = 0;
		for (let i = track; i < sizes.length; i += n)
			largest = Math.max(largest, sizes[i]);
		total += largest;
	}
	return total;
};

/** The palette's size, line count and copies built, on each of 30 frames. */
const settle = (page: Page): Promise<string[]> =>
	page.evaluate(async (selector) => {
		const seen = new Set<string>();
		for (let frame = 0; frame < 30; frame++) {
			await new Promise<void>((r) => requestAnimationFrame(() => r()));
			const palette = document.querySelector<HTMLElement>(selector);
			const list = palette?.querySelector<HTMLElement>(
				".classicyApplicationSwitcherButtons",
			);
			const box = palette?.getBoundingClientRect();
			seen.add(
				`${box?.width}x${box?.height} lines ${list?.style.getPropertyValue("--application-switcher-lines")} copies ${(window as unknown as { __paletteCopies: unknown[] }).__paletteCopies.length}`,
			);
		}
		return [...seen];
	}, PALETTE);

const zoomBox = async (page: Page, modifiers: string[]) => {
	for (const key of modifiers) await page.keyboard.down(key);
	await page.locator(`${PALETTE} [data-classicy-control="zoom"]`).click();
	for (const key of [...modifiers].reverse()) await page.keyboard.up(key);
	await page.waitForTimeout(500);
};

let browser: Awaited<ReturnType<typeof launchParityBrowser>>;
try {
	browser =
		browserName === "chromium"
			? await launchParityBrowser()
			: await (await loadPlaywright()).firefox.launch();
} catch (e) {
	process.stderr.write(
		`check-app-switcher-palette: ${String(e).split("\n")[0]}\n`,
	);
	process.exit(2);
}

let failed = false;
const report = (ok: boolean, pkg: string, what: string) => {
	if (!ok) failed = true;
	process.stdout.write(
		`${ok ? "ok  " : "FAIL"} [${browserName} ${pkg}] ${what}\n`,
	);
};

const load = async (pkg: string) => {
	const { ctx, page } = await newStoryPage(browser);
	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.addInitScript(recordCopies);
	try {
		await page.goto(
			`${storyUrl(baseUrl, story)}&globals=appearancePackage:${pkg}`,
			{ waitUntil: "load", timeout: 90000 },
		);
		await waitForStoryReady(page);
	} catch (e) {
		environmentError(
			`cannot load story ${story} from ${baseUrl}: ${String(e).split("\n")[0]}`,
		);
	}
	if (
		await page.evaluate(() =>
			document.body.classList.contains("sb-show-errordisplay"),
		)
	)
		environmentError(`story ${story} did not render (is the id right?)`);
	// The story tears the palette off a moment after it mounts.
	await page.waitForTimeout(1200);
	const drawn = await page.evaluate(
		() =>
			document
				.querySelector(".classicyDesktop")
				?.getAttribute("data-classicy-appearance") ?? "",
	);
	report(drawn === pkg, pkg, `the story draws ${pkg} (found "${drawn}")`);
	return { ctx, page, errors };
};

/** One desktop size: settles, cuts nothing, counts the desktop's capacity. */
const checkAt = async (page: Page, label: string, size: [number, number]) => {
	const [width, height] = size;
	await page.setViewportSize({ width, height });
	await page.waitForTimeout(500);
	const where = `${label}, desktop ${width}x${height}`;
	const states = await settle(page);
	report(
		states.length === 1,
		"platinum",
		`${where}: settles (${states.join(" | ")})`,
	);
	const g = await measure(page);
	if (!g) {
		report(false, "platinum", `${where}: the palette is drawn`);
		return;
	}
	const lines = extent(g.alone, g.perLine, g.gap);
	// The frame along the line: what the palette is, less its buttons' line.
	const chrome = g.along - lines;
	// A single track that cannot fit at all is not the count's to fix.
	const oneFits = chrome + extent(g.alone, 1, g.gap) <= g.room + 0.01;
	report(
		!oneFits || (g.buttonPast <= 0.01 && g.listPast <= 0.01),
		"platinum",
		`${where}: the window cuts nothing (${g.perLine} a line of ${g.count}; a button passes its padding box by ${g.buttonPast.toFixed(2)}, the list with its margin by ${g.listPast.toFixed(2)})`,
	);
	report(
		g.height <= g.maxHeight + 0.01,
		"platinum",
		`${where}: the window is no taller than its maximum height (${g.height} of ${g.maxHeight})`,
	);
	const fits = !oneFits || g.along <= g.room + 0.01;
	const most =
		g.perLine === g.count ||
		chrome + extent(g.alone, g.perLine + 1, g.gap) > g.room;
	report(
		fits && most,
		"platinum",
		`${where}: ${g.perLine} a line is the most the desktop holds (the line ${g.along}, room ${g.room}; with ${g.perLine + 1} a line ${chrome + extent(g.alone, g.perLine + 1, g.gap)})`,
	);
	const copy = g.copies.filter((c) => c.horizontal === g.horizontal).at(-1);
	const read = copy?.sizes.map(([w, h]) => (g.horizontal ? w : h)) ?? [];
	report(
		!!copy &&
			!copy.wrapped &&
			copy.lines === "" &&
			copy.position === "absolute" &&
			copy.visibility === "hidden" &&
			copy.ariaHidden === "true" &&
			copy.inert &&
			read.length === g.alone.length &&
			read.every((size, i) => Math.abs(size - g.alone[i]) < 0.01),
		"platinum",
		`${where}: the count read each button's natural size from a hidden, unwrapped copy (${copy ? `${read.map((s) => +s.toFixed(2)).join(",")} against ${g.alone.map((s) => +s.toFixed(2)).join(",")}; wrapped ${copy.wrapped}, position ${copy.position}, visibility ${copy.visibility}` : "no copy was built"})`,
	);
};

{
	const { ctx, page, errors } = await load("platinum");
	try {
		if (!(await page.$(PALETTE)))
			environmentError(`story ${story} drew no palette`);
		// Against the menu bar, so the whole window shows on a short desktop.
		const bar = await page
			.locator(`${PALETTE} .classicyWindowTitleBar`)
			.boundingBox();
		if (bar) {
			await page.mouse.move(bar.x + bar.width / 2, bar.y + 3);
			await page.mouse.down();
			await page.mouse.move(300, 80, { steps: 6 });
			await page.mouse.move(300, 20, { steps: 4 });
			await page.mouse.up();
			await page.waitForTimeout(400);
		}
		const heights: [number, number][] = [
			[1024, 768],
			[1024, 380],
			[1024, 360],
			[1024, 340],
			[1024, 300],
			[1024, 220],
		];
		for (const size of heights)
			await checkAt(page, "a column, large icons", size);
		await page.setViewportSize({ width: 1024, height: 768 });
		await zoomBox(page, ["Alt"]);
		for (const size of [
			[1024, 250],
			[1024, 220],
			[1024, 200],
			[1024, 160],
		] as [number, number][])
			await checkAt(page, "a column, small icons", size);
		await page.setViewportSize({ width: 1024, height: 768 });
		await zoomBox(page, ["Alt"]);
		await zoomBox(page, ["Alt", "Shift"]);
		for (const size of [
			[1200, 768],
			[1024, 768],
			[800, 768],
			[640, 768],
			[400, 768],
		] as [number, number][])
			await checkAt(page, "a row, large icons", size);
		// Dragged partly past the right edge, a wrapped palette keeps its shape.
		await page.setViewportSize({ width: 640, height: 768 });
		await page.waitForTimeout(500);
		const before = await measure(page);
		const side = await page
			.locator(`${PALETTE} .classicyWindowTitleBar`)
			.boundingBox();
		if (side) {
			await page.mouse.move(side.x + side.width / 2, side.y + side.height / 2);
			await page.mouse.down();
			await page.mouse.move(side.x + 200, side.y + 200, { steps: 6 });
			await page.mouse.move(side.x + 320, side.y + 240, { steps: 6 });
			await page.mouse.up();
			await page.waitForTimeout(500);
		}
		const moved = await measure(page);
		report(
			!!before &&
				!!moved &&
				before.perLine < before.count &&
				moved.along === before.along &&
				moved.across === before.across &&
				moved.perLine === before.perLine,
			"platinum",
			`a wrapped row dragged partly past the right edge keeps its shape (${before?.along}x${before?.across} at ${before?.perLine} a line, then ${moved?.along}x${moved?.across} at ${moved?.perLine})`,
		);
		report(
			errors.length === 0,
			"platinum",
			`no page errors ${errors.slice(0, 3).join("; ")}`,
		);
	} finally {
		await ctx.close();
	}
}

{
	const { ctx, page, errors } = await load("system7");
	try {
		report(
			!(await page.$(PALETTE)),
			"system7",
			"no palette is drawn (System 7.5 had no tear-off)",
		);
		report(
			errors.length === 0,
			"system7",
			`no page errors ${errors.slice(0, 3).join("; ")}`,
		);
	} finally {
		await ctx.close();
	}
}

await browser.close();
process.exit(failed ? 1 : 0);
