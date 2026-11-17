#!/usr/bin/env node
// Captures the System 7.5.5 reference screenshots and the Simple Beep
// recording from Infinite Mac (plan 0018-dbd §3.1, story 0212-rce;
// docs/system7-reference-screenshots.md). A dev tool, not shipped: the
// captures are references, kept out of git in
// `.playwright-mcp/parity/system7/reference/`.
//
//   node packages/appearance/system7/bin/capture-references.mjs run <out> [--only <regex>]
//   node packages/appearance/system7/bin/capture-references.mjs beep <out>
//   node packages/appearance/system7/bin/capture-references.mjs serve <port> <out> [<disk>]
//
// `run` boots the "System 7.5.5" disk and plays the recipe (SCENES) at 256
// colors, then Black & White (set from the Control Strip's Monitor module),
// then the other depths, saving every capture it names to `<out>` as the
// emulator's own 640 x 480 framebuffer (PNG, exact pixels); `--only` keeps
// the scenes whose `<depth>-<scene>` name matches. `beep` records Simple
// Beep from SimpleSound and compares it with the package's WAV
// (`compareSimpleBeep`), exiting 1 when they disagree. `serve` boots a disk
// (default "System 7.5") and listens on 127.0.0.1:<port> (POST /do, a JSON
// list of steps in the recipe's format; GET /frame, the current frame as
// PNG; GET /scene/<name>/<depth>, one scene; GET /audio, what the emulator
// played since a `["record"]` step, as a WAV; GET /quit), to work out a new
// scene step by step.
//
// Every output path is resolved against the working directory; nothing is
// written anywhere else. Requires the repo's Playwright (a devDependency of
// the workspace root) and its headless Chromium, and a network connection
// to infinitemac.org.

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = resolve(fileURLToPath(import.meta.url), "../../../../..");
const { chromium } = createRequire(join(REPO_ROOT, "package.json"))(
	"playwright",
);

/** Infinite Mac's `disk` on its default machine, embedded. */
export const emulatorUrl = (disk = "System 7.5") =>
	`https://infinitemac.org/embed?disk=${encodeURIComponent(disk).replaceAll("%20", "+")}&machine=Quadra+650&infinite_hd=false&saved_hd=true&screen_update_messages=true&screen_update_interval=100&screenSize=640x480`;

// Runs in the page before the embed loads: keeps the latest framebuffer the
// emulator posts (`emulator_screen`, RGBA 640 x 480) with a counter, so a
// capture can wait for a frame drawn after its last input; and taps every
// node connected to the audio destination, so `/record` can keep the
// emulator's output as it plays (Float32, the context's rate, channel 0).
const PAGE_INIT = () => {
	window.__frames = 0;
	window.addEventListener("message", (event) => {
		if (event.data?.type === "emulator_screen") {
			window.__frame = event.data;
			window.__frames++;
		}
	});
	window.__audio = { recording: false, rate: 0, chunks: [] };
	const connect = AudioNode.prototype.connect;
	const tapped = new WeakSet();
	AudioNode.prototype.connect = function (target, ...rest) {
		if (target instanceof AudioDestinationNode && !tapped.has(this)) {
			tapped.add(this);
			const context = this.context;
			const tap = context.createScriptProcessor(4096, 1, 1);
			const mute = context.createGain();
			mute.gain.value = 0;
			window.__audio.rate = context.sampleRate;
			tap.onaudioprocess = (e) => {
				if (window.__audio.recording)
					window.__audio.chunks.push(
						Float32Array.from(e.inputBuffer.getChannelData(0)),
					);
			};
			connect.call(this, tap);
			connect.call(tap, mute);
			connect.call(mute, context.destination);
		}
		return connect.call(this, target, ...rest);
	};
};

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Infinite Mac's yellow welcome note (Stickies), #FFFF99 in color. */
const yellow = ([r, g, b]) => r > 200 && g > 200 && b < r - 50;
const same = (a, b) => a.every((v, i) => v === b[i]);

/** The emulator: a page, its canvas's origin, and the input helpers. */
export async function bootEmulator({ disk, log = () => {} } = {}) {
	const browser = await chromium.launch({
		headless: true,
		args: ["--disable-gpu", "--autoplay-policy=no-user-gesture-required"],
	});
	const page = await browser.newPage({
		viewport: { width: 700, height: 620 },
		deviceScaleFactor: 1,
	});
	await page.addInitScript(PAGE_INIT);
	await page.goto(emulatorUrl(disk));
	const canvas = page.locator("canvas").first();
	await canvas.waitFor({ timeout: 120_000 });
	const box = await canvas.boundingBox();
	if (!box) throw new Error("the emulator canvas has no box");
	const at = (x, y) => [box.x + x, box.y + y];
	const frames = () => page.evaluate(() => window.__frames);
	const emulator = {
		out: ".",
		browser,
		page,
		frames,
		/** The latest frame as PNG bytes (after one drawn later than `after`). */
		async frame(after = -1) {
			for (let i = 0; i < 100 && (await frames()) <= after; i++)
				await sleep(50);
			const base64 = await page.evaluate(async () => {
				const f = window.__frame;
				const canvas = new OffscreenCanvas(f.width, f.height);
				canvas
					.getContext("2d")
					.putImageData(
						new ImageData(new Uint8ClampedArray(f.data), f.width, f.height),
						0,
						0,
					);
				const blob = await canvas.convertToBlob({ type: "image/png" });
				const bytes = new Uint8Array(await blob.arrayBuffer());
				let s = "";
				for (const b of bytes) s += String.fromCharCode(b);
				return btoa(s);
			});
			return Buffer.from(base64, "base64");
		},
		async step(step) {
			const [kind, ...args] = Array.isArray(step) ? step : [step];
			switch (kind) {
				// The emulated pointer follows the host's with a lag: every move
				// waits for it to arrive before the next press.
				case "move":
					await page.mouse.move(...at(args[0], args[1]), {
						steps: args[2] ?? 4,
					});
					return sleep(args[3] ?? 400);
				case "down":
					return page.mouse.down();
				case "up":
					return page.mouse.up();
				case "click":
					await page.mouse.move(...at(args[0], args[1]), { steps: 4 });
					await sleep(400);
					await page.mouse.down();
					await sleep(args[2] ?? 80);
					return page.mouse.up();
				case "double":
					await page.mouse.move(...at(args[0], args[1]), { steps: 4 });
					await sleep(400);
					for (let i = 0; i < 2; i++) {
						await page.mouse.down();
						await sleep(60);
						await page.mouse.up();
						await sleep(60);
					}
					return;
				case "key":
					return page.keyboard.press(args[0]);
				// A modifier held across other steps (Option-dragging the
				// Control Strip's tab).
				case "keyDown":
					return page.keyboard.down(args[0]);
				case "keyUp":
					return page.keyboard.up(args[0]);
				case "type":
					return page.keyboard.type(args[0], { delay: 60 });
				case "wait":
					return sleep(args[0]);
				// A capture: the first frame drawn after a pause, so it shows
				// what the last input did.
				case "shot": {
					const before = await frames();
					await sleep(args[1] ?? 300);
					writeFileSync(
						join(emulator.out, `${args[0]}.png`),
						await emulator.frame(before),
					);
					return;
				}
				// `n` consecutive frames, for an animation (the menu blink).
				case "burst": {
					let last = await frames();
					for (let i = 1; i <= args[1]; i++) {
						const png = await emulator.frame(last);
						last = await frames();
						writeFileSync(join(emulator.out, `${args[0]}-${i}.png`), png);
					}
					return;
				}
				// Quits Stickies (a note must be in front for Command-Q to
				// reach it), until the welcome note is gone: where it was, the
				// desktop's checkerboard shows again, two neighbors unalike.
				case "quitStickies":
					for (
						let attempt = 0;
						same(await emulator.pixel(500, 80), await emulator.pixel(501, 80));
						attempt++
					) {
						if (attempt === 6) throw new Error("Stickies did not quit");
						await emulator.step(["click", 380, 380]);
						await sleep(1_500);
						await page.keyboard.press("Meta+q");
						await sleep(3_000);
					}
					return;
				case "record":
					return page.evaluate(() => {
						window.__audio.chunks = [];
						window.__audio.recording = true;
					});
				default:
					throw new Error(`unknown step ${kind}`);
			}
		},
		/** What the emulator played since the last `record` step, as samples. */
		async audio() {
			const { rate, samples } = await page.evaluate(() => {
				window.__audio.recording = false;
				const all = window.__audio.chunks.flatMap((c) => Array.from(c));
				return { rate: window.__audio.rate, samples: all };
			});
			return { rate, samples: Float32Array.from(samples) };
		},
		/** The pixel at x, y of the latest frame, as [r, g, b]. */
		pixel: (x, y) =>
			page.evaluate(
				([x, y]) => {
					const f = window.__frame;
					if (!f) return [0, 0, 0];
					const d = new Uint8Array(f.data.buffer ?? f.data);
					const i = (y * f.width + x) * 4;
					return [d[i], d[i + 1], d[i + 2]];
				},
				[x, y],
			),
		/** Waits until the pixel at x, y passes `test`. */
		async waitFor(x, y, test, timeout = 30_000) {
			const end = Date.now() + timeout;
			while (!test(await emulator.pixel(x, y))) {
				if (Date.now() > end)
					throw new Error(
						`timed out waiting for the pixel at ${x},${y} (${await emulator.pixel(x, y)})`,
					);
				await sleep(250);
			}
		},
		close: () => browser.close(),
	};
	log("emulator: booting");
	// Boot ends when Infinite Mac's welcome notes are up (Stickies, the
	// yellow note's face at 500,80); quit Stickies, then wait for the note
	// to go.
	// Mac OS 8 (Platinum's references, story 0214-c61) shows its welcome
	// notes elsewhere, and they are left up: boot ends when the Finder's
	// Platinum menu bar is drawn, its face (#E7E7E7 on screen, the emulator
	// showing #DDDDDD through its display gamma) above its black bottom edge
	// (row 19), which no startup screen draws there.
	if (/^Mac OS 8/.test(disk ?? "")) {
		const face = ([r, g, b]) => r === 0xe7 && g === 0xe7 && b === 0xe7;
		const black = ([r, g, b]) => r === 0 && g === 0 && b === 0;
		await emulator.waitFor(100, 10, face, 180_000);
		await emulator.waitFor(100, 19, black, 30_000);
		// The Finder draws its desktop and the welcome notes after the bar.
		await sleep(5_000);
		await emulator.step(["move", 630, 300]);
		return emulator;
	}
	await emulator.waitFor(500, 80, yellow, 90_000);
	await sleep(3_000);
	await emulator.step(["quitStickies"]);
	await emulator.step(["move", 630, 300]);
	return emulator;
}

/** A 16-bit mono WAV of float samples (-1..1). */
export const wav = (rate, samples) => {
	const data = Buffer.alloc(samples.length * 2);
	for (let i = 0; i < samples.length; i++)
		data.writeInt16LE(
			Math.max(-32768, Math.min(32767, Math.round(samples[i] * 32767))),
			i * 2,
		);
	const header = Buffer.alloc(44);
	header.write("RIFF", 0, "latin1");
	header.writeUInt32LE(36 + data.length, 4);
	header.write("WAVEfmt ", 8, "latin1");
	header.writeUInt32LE(16, 16);
	header.writeUInt16LE(1, 20);
	header.writeUInt16LE(1, 22);
	header.writeUInt32LE(rate, 24);
	header.writeUInt32LE(rate * 2, 28);
	header.writeUInt16LE(2, 32);
	header.writeUInt16LE(16, 34);
	header.write("data", 36, "latin1");
	header.writeUInt32LE(data.length, 40);
	return Buffer.concat([header, data]);
};

// The recipe. Every scene starts and ends on the Finder's bare desktop, so
// any one can run alone (`--only`); `d` is the depth, `color` (256 colors)
// or `bw` (Black & White), the files' prefix. Coordinates are the
// emulator's, on System 7.5.5's fresh disk (Infinite Mac's "System 7.5.5"),
// whose windows open where they did when the recipe was written. Menus in
// System 7 stay open only while the button is down, so a held menu or
// pressed control is shot with the button down and the pointer moved off it
// where that keeps it held (a menu stays open), then released where nothing
// happens.

const PARK = ["move", 630, 300];
/** Chooses the Apple menu item at `y`. */
const appleMenu = (y) => [
	["move", 22, 10],
	["down"],
	["wait", 600],
	["move", 60, y, 6],
	["move", 120, y, 4],
	["up"],
	["wait", 3_000],
];
/** Opens the control panel at `y` in the Apple menu's Control Panels submenu. */
const controlPanel = (y) => [
	["move", 22, 10],
	["down"],
	["wait", 600],
	["move", 100, 150, 6],
	["move", 230, 150, 6, 900],
	["move", 250, y, 4],
	["up"],
	["wait", 3_000],
];
/** Chooses the item at y in the menu whose title is at x (top of the bar). */
const menuItem = (x, y) => [
	["move", x, 10],
	["down"],
	["wait", 900],
	["move", x - 26, 30, 6],
	["move", x - 26, y, 4],
	["wait", 400],
	["up"],
	["wait", 2_000],
];
/** Holds the menu at x, y open, the pointer off it, and shoots it. */
const heldMenu = (x, y, name) => [
	["move", x, y],
	["down"],
	["wait", 700],
	["move", 400, 300, 8],
	["shot", name],
	["up"],
	["wait", 600],
];
/** Presses at x, y and shoots, then lets go off the control. */
const pressed = (x, y, name) => [
	["move", x, y],
	["down"],
	["wait", 700],
	["shot", name],
	["move", 400, 300, 8],
	["up"],
	["wait", 600],
];
/** Option-drags the Control Strip's tab, at `from` on the strip's row, to `to`. */
const optionDragTab = (from, to) => [
	["keyDown", "Alt"],
	["move", from, 467],
	["down"],
	["wait", 600],
	["move", 300, 467, 8],
	["move", to < 300 ? 100 : 500, 467, 8],
	["move", to, 467, 8],
	["wait", 600],
	["up"],
	["keyUp", "Alt"],
	["wait", 1_500],
];
/** The Control Strip's Monitor module's depths, by their item's y. */
export const DEPTHS = {
	"black-and-white": 347,
	"4-grays": 360,
	"4-colors": 373,
	"16-grays": 386,
	"16-colors": 399,
	"256-grays": 412,
	"256-colors": 425,
	thousands: 438,
};
/** Sets the depth from the Control Strip's Monitor module. */
const setDepth = (depth) => [
	["move", 50, 477],
	["down"],
	["wait", 900],
	["move", 80, DEPTHS[depth], 6],
	["up"],
	["wait", 4_000],
	PARK,
];
/** Opens Macintosh HD's window (an icon view at 191,172 on a fresh disk). */
const openDisk = [
	["double", 600, 52],
	["wait", 2_500],
];
const deselect = ["click", 300, 440];
/** The Color control panel's Window colors after Standard, in its order. */
const WINDOW_TINTS = [
	"gold",
	"green",
	"turquoise",
	"red",
	"pink",
	"blue",
	"gray",
	"black-and-white",
];
/** Chooses the Window color pop-up's item at `y`. */
const popUpStep = (y) => [
	["move", 300, 141],
	["down"],
	["wait", 800],
	["move", 300, y, 6],
	["up"],
	["wait", 1_500],
];
export const SCENES = {
	// The Application menu's title (the Finder's icon) closed and open.
	appmenu: (d) => [
		PARK,
		["shot", `${d}-755-appmenu-closed`],
		...heldMenu(616, 10, `${d}-755-appmenu-open`),
	],
	// The Control Strip at rest, a module pressed (its menu open) and the
	// collapse box pressed.
	controlstrip: (d) => [
		PARK,
		["shot", `${d}-755-controlstrip`],
		...heldMenu(120, 477, `${d}-755-controlstrip-module-pressed`),
		...pressed(12, 478, `${d}-755-controlstrip-collapse-pressed`),
		PARK,
	],
	// The Control Strip docked at the right edge, Option-dragging its tab
	// there (Control Strip 1.3's own move), then back at the left (story
	// 0214-c61).
	controlstripright: (d) => [
		PARK,
		...optionDragTab(146, 636),
		PARK,
		["shot", `${d}-755-controlstrip-right`],
		...optionDragTab(494, 2),
		PARK,
	],
	// A hidden application (story 0214-c61): Scrapbook in front, Hide
	// Others (the Finder hidden), the Application menu held open, then Show
	// All and Scrapbook closed.
	appmenuhidden: (d) => [
		...appleMenu(276),
		...menuItem(616, 44),
		PARK,
		...heldMenu(616, 10, `${d}-755-appmenu-hidden-app`),
		...menuItem(616, 60),
		["click", 200, 50],
		["wait", 800],
		["key", "Meta+w"],
		["wait", 1_500],
		PARK,
	],
	// Macintosh HD opened, then the window and its list view.
	finder: (d) => [
		...openDisk,
		deselect,
		PARK,
		["shot", `${d}-755-icon-opened-unselected`],
		["click", 316, 180],
		["move", 116, 10],
		["down"],
		["wait", 700],
		["move", 400, 300, 8],
		["shot", `${d}-755-menu-pulldown-view-checkmark`],
		["move", 150, 59, 8],
		["up"],
		["wait", 2_500],
		["click", 221, 256],
		["wait", 1_000],
		PARK,
		["shot", `${d}-755-finder-list-row-selected`],
		...pressed(208, 184, `${d}-755-finder-closebox-pressed`),
		...pressed(431, 184, `${d}-755-finder-zoombox-pressed`),
		// The scroll box dragged off the horizontal bar (y 315-330): the
		// outline follows the pointer to 24 px past the bar, and snaps back
		// at 25, above and below.
		["move", 213, 322],
		["down"],
		["wait", 500],
		["move", 280, 322, 6],
		["move", 280, 354, 4],
		["shot", `${d}-755-scrollbox-drag-24-below`],
		["move", 280, 355, 2],
		["shot", `${d}-755-scrollbox-drag-25-below`],
		["move", 280, 291, 8],
		["shot", `${d}-755-scrollbox-drag-24-above`],
		["move", 280, 290, 2],
		["shot", `${d}-755-scrollbox-drag-25-above`],
		["move", 213, 322, 8],
		["up"],
		["wait", 800],
		// Back to the icon view, so the next depth starts alike.
		["move", 116, 10],
		["down"],
		["wait", 700],
		["move", 150, 43, 8],
		["up"],
		["wait", 2_000],
		["key", "Meta+w"],
		["wait", 1_500],
		deselect,
		PARK,
	],
	// The Clock Options dialog (Date & Time): dimmed checkboxes, pop-ups
	// and a button.
	clockoptions: (d) => [
		...controlPanel(139),
		["click", 378, 279],
		["wait", 3_000],
		PARK,
		["shot", `${d}-755-dialog-clockoptions`],
		["click", 437, 345],
		["wait", 1_500],
		["key", "Meta+w"],
		["wait", 1_500],
		PARK,
	],
	// The Memory control panel: a dimmed pop-up and slider; then its slider
	// dragged (RAM Disk on), put back and RAM Disk off again.
	memory: (d) => [
		...controlPanel(347),
		PARK,
		["shot", `${d}-755-controlpanel-memory`],
		["click", 173, 320],
		["wait", 800],
		["move", 268, 312],
		["down"],
		["wait", 500],
		["move", 330, 312, 8],
		["shot", `${d}-755-slider-dragging`],
		["move", 268, 312, 8],
		["up"],
		["wait", 500],
		["click", 173, 334],
		["wait", 800],
		["key", "Meta+w"],
		["wait", 1_500],
		PARK,
	],
	// A note alert: Energy Saver on a machine it does not support.
	energysaver: (d) => [
		...controlPanel(187),
		PARK,
		["shot", `${d}-755-alert-note-energysaver`],
		["click", 459, 181],
		["wait", 1_500],
		PARK,
	],
	// Stickies' notes: a size box on a window without scroll bars.
	stickies: (d) => [
		...appleMenu(312),
		["wait", 2_000],
		PARK,
		["shot", `${d}-755-stickies-notes`],
		["quitStickies"],
		PARK,
	],
	// A chosen menu item's blink (General Controls' default, three).
	menublink: (d) => [
		["move", 232, 10],
		["down"],
		["wait", 700],
		["move", 250, 27, 6],
		["up"],
		["burst", `${d}-755-menu-blink`, 8],
		PARK,
	],
	// Scrapbook: a no-grow window's horizontal scroll bar, active, its boxes
	// pressed, and inactive.
	scrapbook: (d) => [
		...appleMenu(276),
		PARK,
		["shot", `${d}-755-scrapbook-active`],
		...pressed(35, 56, `${d}-755-scrapbook-closebox-pressed`),
		...pressed(398, 56, `${d}-755-scrapbook-zoombox-pressed`),
		deselect,
		PARK,
		["shot", `${d}-755-scrapbook-inactive`],
		["click", 200, 50],
		["wait", 1_000],
		["key", "Meta+w"],
		["wait", 1_500],
		PARK,
	],
	// The Label menu with its title dimmed (a control panel in front).
	labeldimmed: (d) => [
		...controlPanel(235),
		...heldMenu(180, 10, `${d}-755-menu-pulldown-label-alldimmed`),
		["key", "Meta+w"],
		["wait", 1_500],
		PARK,
	],
	// The Color control panel's window colors (color only), each on an
	// active document window, then Standard again. A pop-up menu opens with
	// its current item over the box (y 141), so the next tint down is always
	// at 157, the one up at 125.
	tints: (d) =>
		d === "bw"
			? []
			: [
					...openDisk,
					...controlPanel(91),
					...WINDOW_TINTS.flatMap((tint) => [
						...popUpStep(157),
						["click", 316, 180],
						["wait", 1_000],
						PARK,
						["shot", `color-755-window-tint-${tint}`],
						["click", 246, 51],
						["wait", 1_000],
					]),
					...WINDOW_TINTS.flatMap(() => popUpStep(125)),
					["key", "Meta+w"],
					["wait", 1_500],
					["key", "Meta+w"],
					["wait", 1_500],
					deselect,
					PARK,
				],
	// The stop alert for erasing the startup disk.
	erasedisk: (d) => [
		["click", 600, 52],
		["move", 232, 10],
		["down"],
		["wait", 700],
		["move", 250, 91, 6],
		["up"],
		["wait", 2_000],
		PARK,
		["shot", `${d}-755-alert-stop-erasedisk`],
		["key", "Enter"],
		["wait", 1_500],
		deselect,
		PARK,
	],
	// Two routes tried for a dimmed checked checkbox (story 0212-rce): Get
	// Info on a locked application while it runs (SimpleText, in Apple
	// Extras), and on a locked item in the Trash (CPU Energy Saver). Both
	// draw the Locked box checked and enabled, so 7.5.5 shows none here
	// either (docs/system7-reference-screenshots.md, "Not captured"). Each
	// item is unlocked again and the Trash emptied of it (Put Away), so the
	// scenes after it start alike.
	lockedgetinfo: (d) => [
		...openDisk,
		["double", 235, 288],
		["wait", 3_000],
		// Lock SimpleText, launch it, and Get Info on it from the Finder.
		["click", 70, 240],
		["key", "Meta+i"],
		["wait", 2_500],
		["click", 22, 320],
		["wait", 800],
		["key", "Meta+w"],
		["wait", 1_500],
		["double", 70, 240],
		["wait", 5_000],
		["click", 605, 320],
		["wait", 2_500],
		["click", 70, 240],
		["key", "Meta+i"],
		["wait", 2_500],
		PARK,
		["shot", `${d}-755-getinfo-locked-running-app`],
		["key", "Meta+w"],
		["wait", 1_500],
		// Quit SimpleText (its icon brings it forward), then unlock it.
		["double", 70, 240],
		["wait", 2_500],
		["key", "Meta+q"],
		["wait", 2_500],
		["click", 70, 240],
		["key", "Meta+i"],
		["wait", 2_500],
		["click", 22, 320],
		["wait", 800],
		["key", "Meta+w"],
		["wait", 1_500],
		// Lock CPU Energy Saver, drag it to the Trash, and Get Info on it
		// there.
		["click", 327, 140],
		["key", "Meta+i"],
		["wait", 2_500],
		["click", 22, 293],
		["wait", 800],
		["key", "Meta+w"],
		["wait", 1_500],
		["move", 327, 140],
		["down"],
		["wait", 300],
		["move", 450, 145, 10],
		["move", 600, 150, 10, 800],
		["up"],
		["wait", 2_500],
		["double", 600, 150],
		["wait", 3_000],
		["click", 190, 420],
		["key", "Meta+i"],
		["wait", 2_500],
		PARK,
		["shot", `${d}-755-getinfo-locked-in-trash`],
		["key", "Meta+w"],
		["wait", 1_500],
		// Put it away, close the Trash, and unlock it where it was.
		["key", "Meta+y"],
		["wait", 2_500],
		["key", "Meta+w"],
		["wait", 1_500],
		["click", 327, 140],
		["key", "Meta+i"],
		["wait", 2_500],
		["click", 22, 293],
		["wait", 800],
		["key", "Meta+w"],
		["wait", 1_500],
		["key", "Meta+w"],
		["wait", 1_500],
		["key", "Meta+w"],
		["wait", 1_500],
		deselect,
		PARK,
	],
	// The Standard File box (SimpleText's Open), over SimpleText. Last in
	// each pass: opening a document adds Recent Documents to the Apple menu,
	// which moves the items below it.
	standardfile: (d) => [
		...openDisk,
		["double", 235, 232],
		["wait", 5_000],
		["key", "Meta+o"],
		["wait", 2_500],
		PARK,
		["shot", `${d}-755-dialog-standardfile-layout`],
		["key", "Meta+Period"],
		["wait", 1_500],
		["key", "Meta+q"],
		["wait", 2_500],
		["key", "Meta+w"],
		["wait", 1_500],
		deselect,
		PARK,
	],
};

/** Every scene at both depths, then the other depths (color first: a
 * return to 256 colors from Black & White leaves a different palette). */
async function run(out, only) {
	mkdirSync(out, { recursive: true });
	const emulator = await bootEmulator({
		disk: "System 7.5.5",
		log: console.log,
	});
	emulator.out = out;
	const wanted = (name) => !only || new RegExp(only).test(name);
	try {
		for (const d of ["color", "bw"]) {
			if (d === "bw")
				for (const step of setDepth("black-and-white"))
					await emulator.step(step);
			for (const [name, scene] of Object.entries(SCENES)) {
				if (!wanted(`${d}-755-${name}`)) continue;
				console.log(`scene ${d}-${name}`);
				for (const step of scene(d)) await emulator.step(step);
			}
		}
		for (const depth of Object.keys(DEPTHS)) {
			if (depth === "black-and-white" || !wanted(`755-depth-${depth}`))
				continue;
			console.log(`depth ${depth}`);
			for (const step of [
				...setDepth(depth),
				...openDisk,
				PARK,
				["shot", `755-depth-${depth}`],
				["key", "Meta+w"],
				["wait", 1_500],
				deselect,
				PARK,
			])
				await emulator.step(step);
		}
	} finally {
		await emulator.close();
	}
}

/**
 * Compares an emulator recording of Simple Beep (float samples, the
 * context's rate) with the package's rendered WAV (8-bit unsigned): the
 * levels of the recording's steady samples, half-cycle by half-cycle, its
 * frequency, and the order of its amplitude steps. The emulator hands its
 * 8-bit stream to the page as 16-bit (each byte doubled), so a float sample
 * is a byte again as its high byte, plus 128.
 */
export const compareSimpleBeep = (recording, rate, wavFile) => {
	const wav = readFileSync(wavFile);
	if (wav.readUInt32LE(24) !== rate)
		throw new Error(
			`the recording is at ${rate} Hz, the WAV at ${wav.readUInt32LE(24)}`,
		);
	const rendered = [...wav.subarray(44, 44 + wav.readUInt32LE(40))];
	const recorded = Array.from(
		recording,
		(v) => (Math.round(v * 32768) >> 8) + 128,
	);
	// Runs of one value: a half cycle, or (a run of 1 to 4) the samples the
	// emulator interpolates at an edge, from its 22,254.5 Hz to 22,050 Hz.
	const halves = (samples) => {
		const out = [];
		for (let i = 0; i < samples.length; ) {
			let j = i;
			while (j < samples.length && samples[j] === samples[i]) j++;
			if (j - i >= 5 && samples[i] !== 128 && samples[i] !== 127)
				out.push({ value: samples[i], at: i, length: j - i });
			i = j;
		}
		return out;
	};
	const rec = halves(recorded);
	const ren = halves(rendered);
	// Each step as its high/low pair, in order, each once.
	const steps = (list) => {
		const out = [];
		for (let i = 0; i + 1 < list.length; i++) {
			const hi = Math.max(list[i].value, list[i + 1].value);
			const lo = Math.min(list[i].value, list[i + 1].value);
			const last = out.at(-1);
			if (!last || last[0] !== hi || last[1] !== lo) out.push([hi, lo]);
		}
		return out.filter(([hi, lo]) => hi - 127 === 127 - lo);
	};
	const recSteps = steps(rec);
	const renSteps = steps(ren);
	// Every recorded step is a rendered one, in the same order (the
	// recording may skip a step its buffer schedule passed over).
	let k = 0;
	for (const step of recSteps) {
		while (k < renSteps.length && renSteps[k].join() !== step.join()) k++;
		if (k === renSteps.length)
			return {
				ok: false,
				why: `recorded step ${step} is not rendered in order`,
				recSteps,
				renSteps,
			};
	}
	// Rising edges, a low half then a high one (samples between the
	// halves, at 127 or 128, decide nothing), over the sound.
	const frequency = (samples) => {
		const rises = [];
		let low = false;
		for (let i = 0; i < samples.length; i++)
			if (samples[i] < 127) low = true;
			else if (samples[i] > 128 && low) {
				rises.push(i);
				low = false;
			}
		return (rate * (rises.length - 1)) / (rises.at(-1) - rises[0]);
	};
	const fRec = frequency(recorded);
	const fRen = frequency(rendered);
	const span = (list) => list.at(-1).at + list.at(-1).length - list[0].at;
	return {
		// Within 0.1%: each edge is placed to the whole sample.
		ok: Math.abs(fRec - fRen) / fRen < 1e-3,
		recSteps,
		renSteps,
		frequency: { recorded: fRec, rendered: fRen },
		halfCycle: {
			recorded: [
				Math.min(...rec.map((h) => h.length)),
				Math.max(...rec.map((h) => h.length)),
			],
			rendered: [
				Math.min(...ren.map((h) => h.length)),
				Math.max(...ren.map((h) => h.length)),
			],
		},
		durationMs: {
			recorded: (span(rec) / rate) * 1000,
			rendered: (span(ren) / rate) * 1000,
		},
	};
};

/** Records Simple Beep from SimpleSound's list and compares it (above). */
async function beep(out) {
	mkdirSync(out, { recursive: true });
	const emulator = await bootEmulator({
		disk: "System 7.5.5",
		log: console.log,
	});
	try {
		for (const step of [
			...appleMenu(294),
			["wait", 2_000],
			["record"],
			["click", 70, 123],
			["wait", 2_500],
		])
			await emulator.step(step);
		const { rate, samples } = await emulator.audio();
		writeFileSync(
			join(out, "755-simple-beep-recording.wav"),
			wav(rate, samples),
		);
		const result = compareSimpleBeep(
			samples,
			rate,
			join(
				REPO_ROOT,
				"packages/appearance/system7/src/assets/sounds/system7/sprites/ClassicyAlertSimpleBeep.wav",
			),
		);
		console.log(JSON.stringify(result, null, 1));
		if (!result.ok) process.exitCode = 1;
	} finally {
		await emulator.close();
	}
}

async function serve(port, out, disk) {
	mkdirSync(out, { recursive: true });
	const emulator = await bootEmulator({ disk, log: console.log });
	emulator.out = out;
	const server = createServer(async (req, res) => {
		try {
			if (req.url === "/frame") {
				res.setHeader("content-type", "image/png");
				res.end(await emulator.frame());
				return;
			}
			if (req.url === "/audio") {
				const { rate, samples } = await emulator.audio();
				res.setHeader("content-type", "audio/wav");
				res.end(wav(rate, samples));
				return;
			}
			if (req.url === "/quit") {
				res.end("bye\n");
				await emulator.close();
				server.close();
				return;
			}
			const scene = /^\/scene\/([^/]+)\/(color|bw)$/.exec(req.url ?? "");
			if (scene) {
				for (const step of SCENES[scene[1]](scene[2]))
					await emulator.step(step);
				res.end("ok\n");
				return;
			}
			let body = "";
			for await (const chunk of req) body += chunk;
			for (const step of JSON.parse(body || "[]")) await emulator.step(step);
			res.end("ok\n");
		} catch (error) {
			res.statusCode = 500;
			res.end(`${error}\n`);
		}
	});
	server.listen(port, "127.0.0.1", () =>
		console.log(`emulator: listening on 127.0.0.1:${port}`),
	);
}

const [command, ...args] = process.argv.slice(2);
if (command === "serve")
	await serve(Number(args[0]), resolve(args[1]), args[2]);
else if (command === "beep") await beep(resolve(args[0]));
else if (command === "run") {
	const only = args.indexOf("--only");
	await run(resolve(args[0]), only >= 0 ? args[only + 1] : undefined);
} else if (command !== undefined)
	throw new Error(`unknown command ${command} (run or serve)`);
