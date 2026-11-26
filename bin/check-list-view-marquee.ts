// Browser check: a press-and-drag that starts below the last row of a list
// view (on the list's own box, which fills the window's contents) draws the
// selection rectangle and selects the rows it crosses, and so does one that
// starts beside a name, under Platinum and System 7 (review items M8, R1-2;
// the unit tests in ClassicyFileBrowser.marquee.test.tsx can only name the
// element pressed, since jsdom lays nothing out: which element a real press
// lands on is a browser fact). Run it against a served static Storybook
// build, as the parity tools are (bin/parity/README.md):
//
//   node bin/check-list-view-marquee.ts --port <n> [--browser chromium|firefox] [storyId]
//
// The story defaults to `desktop-filebrowser--list-view` (a file browser in
// list view). `--browser firefox` needs a Playwright with Firefox installed:
// the workspace's pinned one is installed for Chromium only here, so point
// `$PARITY_PLAYWRIGHT` at one that has it (bin/parity/parityBrowser.ts), e.g.
// `PARITY_PLAYWRIGHT=/path/to/node_modules/playwright`. In each package it
// presses 30 px below the last row, drags up over every row and checks that
// the `selection-marquee` part is drawn while the button is down and that
// every row is selected after the release; then it clears the selection and
// does the same from beside the first row's name, down over every row.
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

const PACKAGES = ["platinum", "system7"] as const;
const DEFAULT_STORY = "desktop-filebrowser--list-view";

const usage = () => {
	process.stderr.write(
		"usage: node bin/check-list-view-marquee.ts --port <n> [--browser chromium|firefox] [storyId]\n",
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

type Row = { path: string; left: number; top: number; bottom: number };
type Layout = {
	rows: Row[];
	nameRight: number;
	listBottom: number;
	listLeft: number;
};

const measure = (page: Page): Promise<Layout> =>
	page.evaluate(() => {
		const rows = [
			...document.querySelectorAll<HTMLElement>(
				"tbody tr [data-classicy-file-path]",
			),
		].map((el) => {
			const r = el.getBoundingClientRect();
			return {
				path: el.getAttribute("data-classicy-file-path") ?? "",
				left: r.left,
				top: r.top,
				bottom: r.bottom,
			};
		});
		const label = document
			.querySelector(".classicyFileBrowserViewTableRowIconLabel")
			?.getBoundingClientRect();
		const list = document
			.querySelector(".classicyFileBrowserViewTableContainer")
			?.getBoundingClientRect();
		return {
			rows,
			nameRight: label?.right ?? 0,
			listBottom: list?.bottom ?? 0,
			listLeft: list?.left ?? 0,
		};
	});

const selected = (page: Page): Promise<string[]> =>
	page.evaluate(() =>
		[
			...document.querySelectorAll(
				'tr[data-selected="true"] [data-classicy-file-path]',
			),
		].map((el) => el.getAttribute("data-classicy-file-path") ?? ""),
	);

/** A press at (x0, y0), a drag to (x1, y1), a release; what showed on the way. */
const drag = async (
	page: Page,
	[x0, y0]: [number, number],
	[x1, y1]: [number, number],
) => {
	const hit = await page.evaluate(
		([x, y]) => {
			const el = document.elementFromPoint(x, y);
			return el ? `${el.tagName}.${[...el.classList].join(".")}` : "nothing";
		},
		[x0, y0] as [number, number],
	);
	await page.mouse.move(x0, y0);
	await page.mouse.down();
	await page.mouse.move((x0 + x1) / 2, (y0 + y1) / 2, { steps: 4 });
	await page.mouse.move(x1, y1, { steps: 4 });
	const marquee = await page.evaluate(
		() => !!document.querySelector('[data-classicy-part="selection-marquee"]'),
	);
	await page.mouse.up();
	await page.waitForTimeout(300);
	return { hit, marquee, selected: await selected(page) };
};

// An environment error (exit 2): one line to stderr, no stack trace.
const environmentError = (message: string): never => {
	process.stderr.write(`check-list-view-marquee: ${message}\n`);
	process.exit(2);
};

let browser: Awaited<ReturnType<typeof launchParityBrowser>>;
try {
	browser =
		browserName === "chromium"
			? await launchParityBrowser()
			: await (await loadPlaywright()).firefox.launch();
} catch (e) {
	process.stderr.write(
		`check-list-view-marquee: ${String(e).split("\n")[0]}\n`,
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

for (const pkg of PACKAGES) {
	const { ctx, page } = await newStoryPage(browser);
	const errors: string[] = [];
	page.on("pageerror", (e) => errors.push(e.message));
	try {
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
		await page.waitForTimeout(600);
		const storyError = await page.evaluate(() =>
			document.body.classList.contains("sb-show-errordisplay"),
		);
		if (storyError || !(await page.$("tbody tr [data-classicy-file-path]")))
			environmentError(
				`story ${story} did not render a list view (is the id right?)`,
			);
		const drawn = await page.evaluate(
			() =>
				document
					.querySelector(".classicyDesktop")
					?.getAttribute("data-classicy-appearance") ?? "",
		);
		report(drawn === pkg, pkg, `the story draws ${pkg} (found "${drawn}")`);
		const layout = await measure(page);
		const first = layout.rows.reduce((a, r) => (r.top < a.top ? r : a));
		const last = layout.rows.reduce((a, r) => (r.bottom > a.bottom ? r : a));
		const below = last.bottom + 30;
		if (layout.rows.length < 2 || below >= layout.listBottom) {
			report(
				false,
				pkg,
				`room below the rows to press (rows ${layout.rows.length}, last bottom ${last.bottom}, list bottom ${layout.listBottom})`,
			);
			continue;
		}
		const fromBelow = await drag(
			page,
			[first.left + 40, below],
			[first.left + 60, first.top + 2],
		);
		report(
			fromBelow.marquee && fromBelow.selected.length === layout.rows.length,
			pkg,
			`a drag from below the rows (pressed on ${fromBelow.hit}) draws the rectangle and selects every row (${fromBelow.selected.length} of ${layout.rows.length}; rectangle ${fromBelow.marquee})`,
		);
		// A click on the empty space clears the selection.
		await page.mouse.click(first.left + 40, below);
		await page.waitForTimeout(300);
		const beside = await drag(
			page,
			[layout.nameRight + 20, (first.top + first.bottom) / 2],
			[first.left + 30, last.bottom - 2],
		);
		report(
			beside.marquee && beside.selected.length === layout.rows.length,
			pkg,
			`a drag from beside a name (pressed on ${beside.hit}) selects the rows it touches (${beside.selected.length} of ${layout.rows.length}; rectangle ${beside.marquee})`,
		);
		report(
			errors.length === 0,
			pkg,
			`no page errors ${errors.slice(0, 3).join("; ")}`,
		);
	} finally {
		await ctx.close();
	}
}
await browser.close();
process.exit(failed ? 1 : 0);
