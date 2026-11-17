// Browser check: every menu a story can open lies fully inside what shows
// of its desktop (the desktop's box where it overlaps the viewport), across
// and down, its frame's shadow and scroll indicators included (owner report
// 2026-11-17, plan 0018-dbd Batch O: System 7's Help menu opened off the
// screen's right edge; review round 0: menus ran past an embedded desktop's
// bottom). Run it against a served static Storybook build, as the parity
// tools are (bin/parity/README.md):
//
//   node bin/check-menus-on-desktop.ts --port <n> [--embed WxH+L+T] [storyId ...]
//
// `--embed` puts the desktop in a W x H box at (L, T) of the 1024 x 768
// viewport, as a host page embeds it (the desktop's parent sized and
// positioned). With no story ids it checks the System 7 and Platinum
// stories below. In each story it opens, in turn and where the story has
// them:
//
// - every first-level menu of every menu bar (the screen bar's and each
//   window's own), and the first item's submenu in it;
// - its first pop-up menu, combo box and pop-up bevel button, each moved to
//   the desktop's bottom-right corner first, so it opens against both edges;
// - the desktop's contextual menu, right-clicked at its bottom-right corner,
//   and any its story opened, with the first submenu in each.
//
// It measures as a browser paints (each list's border box, outer
// box-shadow and absolutely placed ::before/::after, a scrolling list's
// shadow sibling and its fixed scroll indicators), independently of the
// core's own measurement (ClassicyMenuPlacement.internal.ts), so it checks
// the result, not the code's arithmetic.
//
// Exit codes: 0 when every menu lies inside, 1 when one does not (or a menu
// failed to open), 2 on a usage or environment error. Build script, not
// library code: it reports through stdout/stderr. Erasable TypeScript only.
import type { Page } from "playwright";
import {
	launchParityBrowser,
	newStoryPage,
	waitForStoryReady,
} from "./parity/parityBrowser.ts";
import { storyUrl } from "./parity/parityStories.ts";

const DEFAULT_STORIES = [
	// System 7: menu bars and submenus, the Control Strip's bevel pop-ups and
	// the desktop's contextual menu; a hierarchical menu; pop-ups; a combo box.
	"appearance-system-7-desktop--desktop",
	"appearance-system-7-desktop--desktop-color",
	"appearance-system-7-menus--hierarchical",
	// A contextual menu placed low by its host, past an embedded desktop.
	"appearance-system-7-menus--low-menus",
	"appearance-system-7-controls--controls",
	"appearance-system-7-controls--more-controls",
	// Platinum: the same, and a pull-down long enough to scroll.
	"desktop-desktop--default",
	"desktop-menubar--scrolling-menu",
	"desktop-menubar--with-app-menu",
	// A window's own menu bar (the mirrored package), a contextual submenu.
	"desktop-desktop--mirrored",
	"controls-contextualmenu--with-submenu",
	"controls-popupmenu--default",
	"controls-combobox--starts-with",
	"controls-bevelbutton--popup-vertical",
];

/** A title with a menu, on any bar (screen or window), balloon-wrapped or not. */
const TITLE_SELECTOR = [
	".classicyDesktopMenu > .classicyMenuItem.classicyMenuItemChildMenuIndicator:not(.disabled)",
	".classicyDesktopMenu > .classicyMenuItemBalloonAnchor > .classicyMenuItem.classicyMenuItemChildMenuIndicator:not(.disabled)",
].join(", ");

type Box = [number, number, number, number];
type Measured =
	| {
			what: string;
			ink: Box;
			bounds: Box;
			inside: boolean;
	  }
	| { what: string; missing: true };

const usage = () => {
	process.stderr.write(
		"usage: node bin/check-menus-on-desktop.ts --port <n> [--embed WxH+L+T] [storyId ...]\n",
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
const embed = option("--embed");
if (!port) usage();
const geometry = embed
	? /^(\d+)x(\d+)\+(\d+)\+(\d+)$/.exec(embed)?.slice(1).map(Number)
	: undefined;
if (embed && !geometry) usage();
const stories = args.length > 0 ? args : DEFAULT_STORIES;
const baseUrl = `http://127.0.0.1:${port}`;

// The page's half: what a menu paints, the bounds, and a frame's wait.
// Installed before the story loads, as `window.__menuCheck`.
const pageHelpers = (embedCss: string) => {
	if (embedCss) {
		const style = document.createElement("style");
		style.textContent = embedCss;
		document.addEventListener("DOMContentLoaded", () =>
			document.head.append(style),
		);
	}
	const px = (v: string) => Number.parseFloat(v) || 0;
	const inkOf = (el: Element) => {
		const r = el.getBoundingClientRect();
		const s = getComputedStyle(el);
		let [left, top, right, bottom] = [r.left, r.top, r.right, r.bottom];
		// Outer box-shadows.
		if (s.boxShadow && s.boxShadow !== "none")
			for (const shadow of s.boxShadow.split(/,(?![^(]*\))/)) {
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
			const p = getComputedStyle(el, which);
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
		return [left, top, right, bottom] as [number, number, number, number];
	};
	const union = (boxes: [number, number, number, number][]) =>
		boxes.reduce((a, b) => [
			Math.min(a[0], b[0]),
			Math.min(a[1], b[1]),
			Math.max(a[2], b[2]),
			Math.max(a[3], b[3]),
		]);
	// A menu list with its scroll shadow and its fixed scroll indicators.
	const menuInk = (list: Element) => {
		const parts: Element[] = [list];
		const wrapper = list.parentElement;
		if (wrapper)
			parts.push(
				...wrapper.querySelectorAll(
					":scope > .classicyMenuScrollShadow, :scope > [data-classicy-part^='menu-scroll']",
				),
			);
		return union(
			parts.filter((p) => getComputedStyle(p).display !== "none").map(inkOf),
		);
	};
	const bounds = () => {
		const d = (
			document.querySelector(".classicyDesktop") as HTMLElement
		).getBoundingClientRect();
		return [
			Math.max(d.left, 0),
			Math.max(d.top, 0),
			Math.min(d.right, innerWidth),
			Math.min(d.bottom, innerHeight),
		] as [number, number, number, number];
	};
	const inside = (
		ink: [number, number, number, number],
		b: [number, number, number, number],
	) =>
		ink[0] >= b[0] - 0.01 &&
		ink[1] >= b[1] - 0.01 &&
		ink[2] <= b[2] + 0.01 &&
		ink[3] <= b[3] + 0.01;
	const frame = () =>
		new Promise<void>((r) =>
			requestAnimationFrame(() => requestAnimationFrame(() => r())),
		);
	// Puts `el` at the bounds' bottom-right corner, fixed, correcting for
	// any containing block between it and the viewport.
	const toCorner = async (el: HTMLElement) => {
		const b = bounds();
		const r = el.getBoundingClientRect();
		// A control stretched across its container (a pop-up's `width:
		// 100%`) keeps a control's width once fixed.
		const width = Math.min(r.width, 160);
		const target = { left: b[2] - width - 2, top: b[3] - r.height - 2 };
		Object.assign(el.style, {
			position: "fixed",
			width: `${width}px`,
			left: `${target.left}px`,
			top: `${target.top}px`,
			right: "auto",
			bottom: "auto",
			margin: "0",
			zIndex: "1",
		});
		await frame();
		const at = el.getBoundingClientRect();
		el.style.left = `${target.left * 2 - at.left}px`;
		el.style.top = `${target.top * 2 - at.top}px`;
		await frame();
	};
	const close = async () => {
		document.dispatchEvent(
			new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
		);
		document.body.dispatchEvent(
			new MouseEvent("mousedown", { bubbles: true, button: 0 }),
		);
		await frame();
	};
	Object.assign(window, {
		__menuCheck: {
			inkOf,
			menuInk,
			union,
			bounds,
			inside,
			frame,
			toCorner,
			close,
		},
	});
};

type Helpers = {
	inkOf: (el: Element) => Box;
	menuInk: (list: Element) => Box;
	union: (boxes: Box[]) => Box;
	bounds: () => Box;
	inside: (ink: Box, b: Box) => boolean;
	frame: () => Promise<void>;
	toCorner: (el: HTMLElement) => Promise<void>;
	close: () => Promise<void>;
};

/** Every first-level title's menu, and the first submenu in it. */
const checkTitles = async (page: Page): Promise<Measured[]> => {
	const count = await page.evaluate(
		(selector) => document.querySelectorAll(selector).length,
		TITLE_SELECTOR,
	);
	const results: Measured[] = [];
	for (let i = 0; i < count; i++) {
		results.push(
			...(await page.evaluate(
				async ({ selector, index }) => {
					const h = (window as unknown as { __menuCheck: Helpers }).__menuCheck;
					const title = document.querySelectorAll<HTMLElement>(selector)[index];
					const name =
						title.id ||
						title.querySelector("p")?.textContent?.trim() ||
						String(index);
					// A click the bar has not yet settled from closing the last
					// menu may go unseen: try a few times, a beat apart.
					for (let tries = 0; tries < 4; tries++) {
						if (title.classList.contains("open")) break;
						title.click();
						await h.frame();
						if (!title.classList.contains("open"))
							await new Promise((r) => setTimeout(r, 150));
					}
					const list = title.querySelector(
						":scope > .classicyMenuWrapper > ul",
					);
					if (!list || !title.classList.contains("open"))
						return [{ what: `pull-down ${name}`, missing: true as const }];
					const out: Measured[] = [];
					const measure = (what: string, el: Element) => {
						const ink = h.menuInk(el);
						const b = h.bounds();
						out.push({ what, ink, bounds: b, inside: h.inside(ink, b) });
					};
					measure(`pull-down ${name}`, list);
					// Its first item with a submenu (balloon-wrapped or not).
					const parent = list.querySelector<HTMLElement>(
						":scope > .classicyMenuItem.classicyMenuItemChildMenuIndicator:not(.disabled), :scope > * > .classicyMenuItem.classicyMenuItemChildMenuIndicator:not(.disabled)",
					);
					if (parent) {
						parent.click();
						await h.frame();
						const sub = parent.querySelector(
							":scope > .classicyMenuWrapper > ul",
						);
						if (sub && parent.classList.contains("open"))
							measure(`submenu ${name} > ${parent.id}`, sub);
						else
							out.push({
								what: `submenu ${name} > ${parent.id}`,
								missing: true,
							});
					}
					// Close it again: a click on its open title.
					if (title.classList.contains("open")) title.click();
					await h.frame();
					return out;
				},
				{ selector: TITLE_SELECTOR, index: i },
			)),
		);
	}
	return results;
};

/** A pop-up menu, combo box and bevel pop-up, each opened at the corner. */
const checkControls = async (page: Page): Promise<Measured[]> => {
	const kinds = [
		{
			what: "pop-up menu",
			move: "button.classicyPopUpMenuButton:not(:disabled)",
			press: "",
			surface: '.classicyPopUpMenuList[role="listbox"]',
		},
		{
			what: "combo box",
			move: ".classicyComboBox:has(> .classicyComboBoxIndicator:not(:disabled))",
			press: ".classicyComboBoxIndicator",
			surface: '.classicyPopUpMenuList[role="listbox"]',
		},
		{
			what: "bevel pop-up",
			move: '.classicyBevelButton[aria-haspopup="menu"]:not(:disabled)',
			press: "",
			surface: ".classicyBevelButtonPopup",
		},
	];
	const results: Measured[] = [];
	for (const kind of kinds) {
		const result = await page.evaluate(async (k) => {
			const h = (window as unknown as { __menuCheck: Helpers }).__menuCheck;
			const el = document.querySelector<HTMLElement>(k.move);
			if (!el) return "absent";
			const saved = el.getAttribute("style");
			await h.toCorner(el);
			const target = k.press
				? (el.querySelector<HTMLElement>(k.press) as HTMLElement)
				: el;
			// A press and a quick release, then the click, as the mouse does.
			for (const type of ["mousedown", "mouseup", "click"])
				target.dispatchEvent(
					new MouseEvent(type, {
						bubbles: true,
						cancelable: true,
						button: 0,
						detail: 1,
					}),
				);
			await h.frame();
			const surface = document.querySelector(k.surface);
			let measured: Measured = { what: k.what, missing: true };
			if (surface) {
				const parts = [
					surface,
					...surface.querySelectorAll(":scope > .classicyMenuWrapper > ul"),
					...document.querySelectorAll("[data-classicy-part^='menu-scroll']"),
				];
				const ink = h.union(parts.map(h.inkOf));
				const b = h.bounds();
				measured = {
					what: k.what,
					ink,
					bounds: b,
					inside: h.inside(ink, b),
				};
			}
			await h.close();
			if (saved === null) el.removeAttribute("style");
			else el.setAttribute("style", saved);
			await h.frame();
			return measured;
		}, kind);
		if (result !== "absent") results.push(result);
	}
	return results;
};

/**
 * The contextual menu, right-clicked at the desktop's bottom-right corner,
 * where the desktop has one (an empty desktop's, a window's or a
 * control's): none there is no failure.
 */
const checkContextual = async (page: Page): Promise<Measured[]> => {
	const at = await page.evaluate(() => {
		const h = (window as unknown as { __menuCheck: Helpers }).__menuCheck;
		const b = h.bounds();
		return { x: b[2] - 4, y: b[3] - 4 };
	});
	await page.mouse.click(at.x, at.y, { button: "right" });
	const result = await page.evaluate(async () => {
		const h = (window as unknown as { __menuCheck: Helpers }).__menuCheck;
		await h.frame();
		// Every one open: the right-click's, and any its story placed.
		const found: Measured[] = [];
		for (const wrapper of document.querySelectorAll(
			".classicyContextMenuWrapper",
		)) {
			const list = wrapper.querySelector(":scope > .classicyMenuWrapper > ul");
			if (!list) continue;
			const ink = h.union([h.inkOf(wrapper), h.menuInk(list)]);
			const b = h.bounds();
			found.push({
				what: "contextual menu",
				ink,
				bounds: b,
				inside: h.inside(ink, b),
			});
			// And its first submenu.
			const parent = list.querySelector<HTMLElement>(
				":scope > .classicyMenuItem.classicyMenuItemChildMenuIndicator:not(.disabled), :scope > * > .classicyMenuItem.classicyMenuItemChildMenuIndicator:not(.disabled)",
			);
			if (!parent) continue;
			parent.click();
			await h.frame();
			const sub = parent.querySelector(":scope > .classicyMenuWrapper > ul");
			if (!sub || !parent.classList.contains("open")) {
				found.push({
					what: `contextual submenu > ${parent.id}`,
					missing: true,
				});
				continue;
			}
			const subInk = h.menuInk(sub);
			found.push({
				what: `contextual submenu > ${parent.id}`,
				ink: subInk,
				bounds: b,
				inside: h.inside(subInk, b),
			});
		}
		await h.close();
		return found;
	});
	if (result.length === 0)
		process.stdout.write(
			`skip contextual menu: none at the desktop's bottom-right corner\n`,
		);
	return result;
};

const embedCss = geometry
	? `body{margin:0!important;padding:0!important}` +
		`:has(> .classicyDesktop){position:relative!important;` +
		`width:${geometry[0]}px!important;height:${geometry[1]}px!important;` +
		`margin:${geometry[3]}px 0 0 ${geometry[2]}px!important;padding:0!important}` +
		// The controls stories' frame is at least the viewport's height.
		`.classicyDesktop{width:100%!important;height:100%!important;min-height:0!important}`
	: "";

let browser: Awaited<ReturnType<typeof launchParityBrowser>>;
try {
	browser = await launchParityBrowser();
} catch (e) {
	process.stderr.write(`${String(e)}\n`);
	process.exit(2);
}

const round = (box: Box) => box.map((n) => Math.round(n * 100) / 100).join(",");
let failed = false;
for (const id of stories) {
	const { ctx, page } = await newStoryPage(browser);
	try {
		await page.addInitScript(pageHelpers, embedCss);
		await page.goto(storyUrl(baseUrl, id), {
			waitUntil: "load",
			timeout: 90000,
		});
		await waitForStoryReady(page);
		// A story may open a menu once mounted (after 300 ms); start from
		// none.
		await page.waitForTimeout(600);
		await page.evaluate(() =>
			(window as unknown as { __menuCheck: Helpers }).__menuCheck.close(),
		);
		const results = [
			...(await checkTitles(page)),
			...(await checkControls(page)),
			...(await checkContextual(page)),
		];
		if (results.length === 0) {
			process.stdout.write(`FAIL ${id}: no menu to open\n`);
			failed = true;
		}
		for (const result of results) {
			if ("missing" in result) {
				process.stdout.write(`FAIL ${id} ${result.what}: did not open\n`);
				failed = true;
				continue;
			}
			if (!result.inside) failed = true;
			process.stdout.write(
				`${result.inside ? "ok  " : "FAIL"} ${id} ${result.what}: menu ${round(result.ink)} in ${round(result.bounds)}\n`,
			);
		}
	} finally {
		await ctx.close();
	}
}
await browser.close();
process.exit(failed ? 1 : 0);
