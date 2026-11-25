// Browser check: the Application Switcher's palette counts its lines as the
// browser lays it out (integration review G round 2, F1 to F4, round 3, F2,
// F5 and F11, and round 4, F1 and F2; the unit tests in
// ClassicyApplicationSwitcher.test.tsx run on a layout model, since jsdom
// lays nothing out, so a window's computed `max-height`, the size of a
// button's copy, what the window clips, what a click hits and what a reload
// of saved state draws are browser facts). Run it against a served static
// Storybook build, as the parity tools are (bin/parity/README.md):
//
//   node bin/check-app-switcher-palette.ts --port <n> [--browser chromium|firefox] [storyId]
//
// The story defaults to `desktop-application-switcher--many-applications`
// (eight applications, large icons). `--browser firefox` needs a Playwright
// with Firefox installed: point `$PARITY_PLAYWRIGHT` at one that has it
// (bin/parity/parityBrowser.ts). Under Platinum it lays the palette down a
// column with large and small icons, and across a row with large and small
// icons, on desktops of several sizes; at each it checks that:
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
//   alone (across the line the copies stretch to the largest, as the
//   palette's own buttons do);
// - across, the list with its margin fills the window's contents from top
//   to bottom: the well is stretched to the drag bar's height, not short.
//
// Collapsed across, its close, zoom and collapse boxes lie inside it and are
// what a click there hits; a click on the collapse box expands it, its list
// where it was. Then it drags the wrapped palette partly past the desktop's
// right edge (its shape must not change). With the default story it also
// reloads saved state: the `Persisted` story keeps its desktop state as a
// host's page does (`parameters.classicy.persistence`), so after the
// desktop saves a wrapped column, each of two reloads draws the palette from
// its saved window record, which exists a render before the floating layer
// draws the list (round 2's F1). It checks the palette is where the page
// saved it (no tear-off moved it), counted and wrapped, as above, and
// counted again on a desktop resize. In the `Palette` story (two short
// names) the palette with names is Mac OS 8.5's 158 pixels wide; and under
// System 7 it checks that no palette is drawn.
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
const NAMED_STORY = "desktop-application-switcher--palette";
const PERSISTED_STORY = "desktop-application-switcher--persisted";
/** Where the store saves the desktop state (CLASSICY_DESKTOP_STATE_STORAGE_KEY). */
const SAVED_STATE_KEY = "classicyDesktopState";
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
	/** How far the list's margin box stops short of the window contents'
	 * content box, above and below (0 when the well is stretched). */
	wellShort: [number, number];
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
		const contents = list.closest<HTMLElement>(".classicyWindowContents");
		const listBox = list.getBoundingClientRect();
		let wellShort: [number, number] = [0, 0];
		if (contents) {
			const c = contents.getBoundingClientRect();
			const cs = getComputedStyle(contents);
			wellShort = [
				listBox.top -
					px(listStyle.marginTop) -
					(c.top + px(cs.borderTopWidth) + px(cs.paddingTop)),
				c.bottom -
					px(cs.borderBottomWidth) -
					px(cs.paddingBottom) -
					(listBox.bottom + px(listStyle.marginBottom)),
			];
		}
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
			wellShort,
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

const load = async (pkg: string, id = story) => {
	const { ctx, page } = await newStoryPage(browser);
	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(e.message));
	await page.addInitScript(recordCopies);
	try {
		await page.goto(
			`${storyUrl(baseUrl, id)}&globals=appearancePackage:${pkg}`,
			{ waitUntil: "load", timeout: 90000 },
		);
		await waitForStoryReady(page);
	} catch (e) {
		environmentError(
			`cannot load story ${id} from ${baseUrl}: ${String(e).split("\n")[0]}`,
		);
	}
	if (
		await page.evaluate(() =>
			document.body.classList.contains("sb-show-errordisplay"),
		)
	)
		environmentError(`story ${id} did not render (is the id right?)`);
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
	if (g.horizontal)
		report(
			Math.abs(g.wellShort[0]) < 0.01 && Math.abs(g.wellShort[1]) < 0.01,
			"platinum",
			`${where}: the list with its margin fills the window's contents from top to bottom (short by ${g.wellShort.map((n) => n.toFixed(2)).join(" above, ")} below)`,
		);
};

/** Where a box of the palette is, and what a click at its center hits. */
type Box = {
	control: string;
	inside: boolean;
	hitsItself: boolean;
	hit: string;
};

/** The palette's state: collapsed, its size, its boxes, its list's place. */
const paletteState = (page: Page) =>
	page.evaluate((selector) => {
		const palette = document.querySelector<HTMLElement>(selector);
		const list = palette?.querySelector<HTMLElement>(
			".classicyApplicationSwitcherButtons",
		);
		if (!palette || !list) return undefined;
		const box = palette.getBoundingClientRect();
		const boxes: Box[] = ["close", "zoom", "collapse"].map((control) => {
			const el = palette.querySelector(`[data-classicy-control="${control}"]`);
			if (!el)
				return { control, inside: false, hitsItself: false, hit: "absent" };
			const r = el.getBoundingClientRect();
			const hit = document.elementFromPoint(
				r.left + r.width / 2,
				r.top + r.height / 2,
			);
			return {
				control,
				inside:
					r.left >= box.left - 0.01 &&
					r.right <= box.right + 0.01 &&
					r.top >= box.top - 0.01 &&
					r.bottom <= box.bottom + 0.01,
				hitsItself: !!hit && el.contains(hit),
				hit: hit ? `${hit.tagName}.${[...hit.classList].join(".")}` : "none",
			};
		});
		return {
			collapsed: palette.classList.contains("collapsed"),
			width: box.width,
			height: box.height,
			listTop: list.getBoundingClientRect().top - box.top,
			scrolled: palette.scrollTop + palette.scrollLeft,
			boxes,
		};
	}, PALETTE);

/** A click at the center of the palette's `control` box, as the mouse does. */
const clickBox = async (page: Page, control: string) => {
	const box = await page
		.locator(`${PALETTE} [data-classicy-control="${control}"]`)
		.boundingBox();
	if (!box) return false;
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
	await page.waitForTimeout(500);
	return true;
};

/**
 * Drags the palette by its drag bar against the menu bar, at `x`, so the
 * whole window shows on a short desktop.
 */
const dragToMenuBar = async (page: Page, x: number) => {
	const bar = await page
		.locator(`${PALETTE} .classicyWindowTitleBar`)
		.boundingBox();
	if (!bar) return;
	await page.mouse.move(bar.x + bar.width / 2, bar.y + 3);
	await page.mouse.down();
	await page.mouse.move(x, 80, { steps: 6 });
	await page.mouse.move(x, 20, { steps: 4 });
	await page.mouse.up();
	await page.waitForTimeout(400);
};

/** The palette's place: its window's left and top, as its record keeps them. */
const placeOf = (page: Page) =>
	page.evaluate((selector) => {
		const palette = document.querySelector<HTMLElement>(selector);
		return palette ? `${palette.style.left} ${palette.style.top}` : "none";
	}, PALETTE);

/**
 * Whether, within 5 s, the desktop state the page saved holds the palette
 * open with its window record at `place` (the store saves 500 ms after a
 * change).
 */
const savedAt = (page: Page, place: string) =>
	page
		.waitForFunction(
			([key, at]) => {
				try {
					const app = JSON.parse(localStorage.getItem(key) ?? "null")?.System
						?.Manager?.Applications?.apps?.["ApplicationSwitcher.app"];
					const record = app?.windows?.applications;
					return (
						app?.data?.paletteOpen === true &&
						!!record &&
						record.closed !== true &&
						`${record.position[0]}px ${record.position[1]}px` === at
					);
				} catch {
					return false;
				}
			},
			[SAVED_STATE_KEY, place] as const,
			{ timeout: 5000 },
		)
		.then(
			() => true,
			() => false,
		);

{
	const { ctx, page, errors } = await load("platinum");
	try {
		if (!(await page.$(PALETTE)))
			environmentError(`story ${story} drew no palette`);
		await dragToMenuBar(page, 300);
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
		// Across with small icons: the list sized to the drag bar's height
		// (review G round 3, F11).
		await page.setViewportSize({ width: 1200, height: 768 });
		await zoomBox(page, ["Alt"]);
		for (const size of [
			[1200, 768],
			[800, 768],
			[400, 768],
		] as [number, number][])
			await checkAt(page, "a row, small icons", size);
		// Collapsed across, its three boxes stay in reach, and a click on the
		// collapse box expands it with its list where it was (review G round
		// 3, F2: the boxes were cut off, and in Firefox a scroll into view
		// left the list at the window's top).
		await page.setViewportSize({ width: 1200, height: 768 });
		await page.waitForTimeout(500);
		const open = await paletteState(page);
		await clickBox(page, "collapse");
		const shut = await paletteState(page);
		report(
			!!open &&
				!!shut &&
				shut.collapsed &&
				shut.height === open.height &&
				shut.width < open.width &&
				shut.boxes.every((b) => b.inside && b.hitsItself),
			"platinum",
			`collapsed across, it keeps its height and its close, zoom and collapse boxes lie inside it and are hit (${shut?.width}x${shut?.height}, open ${open?.width}x${open?.height}; ${shut?.boxes.map((b) => `${b.control} ${b.inside ? "inside" : "outside"}, hits ${b.hit}`).join("; ")})`,
		);
		await clickBox(page, "collapse");
		const again = await paletteState(page);
		report(
			!!open &&
				!!again &&
				!again.collapsed &&
				again.height === open.height &&
				again.width === open.width &&
				again.listTop === open.listTop &&
				again.scrolled === 0,
			"platinum",
			`a click on its collapse box expands it, its list ${again?.listTop} from its top as before (${open?.listTop}), scrolled ${again?.scrolled}`,
		);
		await zoomBox(page, ["Alt"]);
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

// Reloaded from saved state (review G round 2, F1, which only a reload of
// saved state shows: the palette's window record exists a render before the
// desktop's floating layer draws its list, and a count keyed on the record
// counted nothing). The `Persisted` story keeps its desktop state as a
// host's page does and tears nothing off once the palette is open, so after
// a reload the palette comes only from what the page saved: where it was
// left, wrapped, and counted again on a desktop resize. Moved between the
// reloads, so the second reload draws what the reloaded page saved.
if (story === DEFAULT_STORY) {
	const { ctx, page, errors } = await load("platinum", PERSISTED_STORY);
	try {
		if (!(await page.$(PALETTE)))
			environmentError(`story ${PERSISTED_STORY} drew no palette`);
		await dragToMenuBar(page, 300);
		await page.setViewportSize({ width: 1024, height: 360 });
		await page.waitForTimeout(500);
		await checkAt(page, "a saved column, before a reload", [1024, 360]);
		for (const reload of [1, 2]) {
			if (reload === 2) await dragToMenuBar(page, 360);
			const place = await placeOf(page);
			report(
				await savedAt(page, place),
				"platinum",
				`before reload ${reload} the page has saved the palette open, at ${place}`,
			);
			await page.reload({ waitUntil: "load", timeout: 90000 });
			await waitForStoryReady(page);
			const drawn = await page
				.waitForSelector(PALETTE, { timeout: 10000 })
				.then(
					() => true,
					() => false,
				);
			await page.waitForTimeout(500);
			const restoredAt = await placeOf(page);
			report(
				drawn && restoredAt === place,
				"platinum",
				`after reload ${reload} the palette is drawn from the saved state, where it was left (${restoredAt}; saved at ${place})`,
			);
			const reloaded = await measure(page);
			report(
				!!reloaded && reloaded.perLine < reloaded.count,
				"platinum",
				`after reload ${reload} the column is counted and wraps (${reloaded?.perLine} a line of ${reloaded?.count})`,
			);
			await checkAt(page, `a saved column after reload ${reload}`, [1024, 360]);
		}
		await checkAt(
			page,
			"a saved column after two reloads, resized",
			[1024, 300],
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

// With names, Mac OS 8.5's palette is 158 pixels wide whatever the names
// (150-pixel buttons; review G round 3, F5): the Palette story's Notes,
// Calendar and Finder.
if (story === DEFAULT_STORY) {
	const { ctx, page, errors } = await load("platinum", NAMED_STORY);
	try {
		const named = await page.evaluate((selector) => {
			const palette = document.querySelector<HTMLElement>(selector);
			return palette
				? {
						width: palette.getBoundingClientRect().width,
						buttons: Array.from(
							palette.querySelectorAll(".classicyApplicationSwitcherButton"),
							(b) => b.getBoundingClientRect().width,
						),
					}
				: undefined;
		}, PALETTE);
		report(
			named?.width === 158 && named.buttons.every((w) => w === 150),
			"platinum",
			`the palette with names is 158 pixels wide, its buttons 150 (${named?.width}; ${named?.buttons.join(", ")})`,
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
