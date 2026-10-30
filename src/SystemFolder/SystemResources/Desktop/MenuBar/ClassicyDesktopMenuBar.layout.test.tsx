import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { act, render } from "@testing-library/react";
import { produce } from "immer";
import * as sass from "sass";
import { beforeEach, describe, expect, it } from "vitest";
import {
	type ClassicyStore,
	DefaultAppManagerState,
} from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManager";
import { useAppManager } from "@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils";
import { ClassicyDesktopMenuBar } from "@/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar";

/**
 * The menu bar lays its clusters out as flex items ordered by their
 * `data-classicy-part`, not as left and right floats, so a package can reorder
 * them with `order` alone. jsdom does no layout: the style half reads the
 * compiled stylesheets, the DOM half checks that every cluster carries its
 * part attribute on the flex item itself.
 */

// vitest's root is the repo root, and jsdom leaves import.meta.url as a
// non-file URL, so resolve from the project root.
const compile = (file: string) =>
	sass.compile(path.resolve(process.cwd(), file), { style: "expanded" }).css;

const menuBarCss = compile(
	"src/SystemFolder/SystemResources/Desktop/MenuBar/ClassicyDesktopMenuBar.scss",
);
const menuCss = compile(
	"src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss",
);
const timeCss = compile(
	"src/SystemFolder/SystemResources/Desktop/MenuBar/Widgets/Time/ClassicyDesktopMenuWidgetTime.scss",
);
const css = [menuBarCss, menuCss, timeCss].join("\n");

/** Sass drops the quotes around an identifier attribute value. */
const unquote = (selector: string) =>
	selector.replace(/=["']([^"'\]]*)["']\]/g, "=$1]");

/**
 * The declarations of the top-level rule whose selector list includes
 * `selector` (rules are matched on the whole selector, so `.classicyDesktopMenu`
 * never finds `.classicyDesktopMenuTime`). `expanded` output puts one selector
 * of a list per line and one declaration per line.
 */
const findRule = (
	selector: string,
): { selectors: string[]; declarations: Record<string, string> } => {
	for (const match of css.matchAll(/^([^{}@\n][^{}]*?) \{\n([^{}]*?)\n\}/gm)) {
		const selectors = match[1].split(",\n").map((s) => unquote(s.trim()));
		if (!selectors.includes(unquote(selector))) continue;
		const declarations: Record<string, string> = {};
		for (const line of match[2].split("\n")) {
			const colon = line.indexOf(":");
			if (colon === -1) continue;
			declarations[line.slice(0, colon).trim()] = line
				.slice(colon + 1)
				.trim()
				.replace(/;$/, "");
		}
		return { selectors, declarations };
	}
	throw new Error(`rule not found: ${selector}`);
};

const rule = (selector: string): Record<string, string> =>
	findRule(selector).declarations;

/** Replace the whole store with defaults plus the given mutations. */
function setStore(mutate: (draft: ClassicyStore) => void): void {
	act(() => {
		useAppManager.setState(produce(DefaultAppManagerState, mutate), true);
	});
}

describe("ClassicyDesktopMenuBar layout — styles", () => {
	it("lays the bar out with flex and order, no floats", () => {
		const bar = rule(".classicyDesktopMenu");
		expect(bar.display).toBe("flex");
		expect(bar["align-items"]).toBe("flex-start");
		expect(
			rule('.classicyDesktopMenu > [data-classicy-part="extensions"]')[
				"margin-left"
			],
		).toBe("auto");
		for (const [part, order] of [
			["apple", "10"],
			["app", "20"],
			["help", "30"],
			["extensions", "40"],
			["clock", "50"],
			["switcher", "60"],
		])
			expect(
				rule(`.classicyDesktopMenu > [data-classicy-part="${part}"]`).order,
			).toBe(order);
		expect(menuBarCss + timeCss).not.toMatch(/float: right/);
	});

	// The bar is a flex item of its .classicyMenuWrapper, which already shrank
	// its content-box `width: 100%` plus padding back to the wrapper's width;
	// border-box states that width directly.
	it("fills the menu wrapper exactly, padding included", () => {
		const bar = rule(".classicyDesktopMenu");
		expect(bar["flex-direction"]).toBe("row");
		expect(bar.width).toBe("100%");
		expect(bar["box-sizing"]).toBe("border-box");
		expect(bar.padding).toBe("0 var(--window-control-size)");
		expect(rule(".classicyDesktopMenu > *").float).toBe("none");
	});

	// A top-level item with balloon help is wrapped in a ClassicyBalloonHelp
	// anchor, so the flex item is the wrapper, not the tagged <li>. Each order
	// rule also matches a direct child that wraps the part, or a wrapped app
	// menu would take order 0 and sort left of the Apple menu.
	it("orders a balloon-wrapped cluster by the part it wraps", () => {
		for (const [part, order] of [
			["apple", "10"],
			["app", "20"],
			["help", "30"],
			["extensions", "40"],
			["clock", "50"],
			["switcher", "60"],
		])
			expect(
				rule(`.classicyDesktopMenu > :has(> [data-classicy-part="${part}"])`)
					.order,
			).toBe(order);
	});

	// A browser without :has() drops a whole rule whose selector list contains
	// it, so the plain order rule must stand alone, ahead of its :has() twin,
	// or such a browser loses the order (and the extensions' auto margin) too.
	it("keeps each plain order rule apart from its :has() twin", () => {
		for (const part of [
			"apple",
			"app",
			"help",
			"extensions",
			"clock",
			"switcher",
		]) {
			const plain = findRule(
				`.classicyDesktopMenu > [data-classicy-part="${part}"]`,
			);
			expect(plain.selectors.join(",")).not.toContain(":has(");
			const twin = rule(
				`.classicyDesktopMenu > :has(> [data-classicy-part="${part}"])`,
			);
			expect(twin).toEqual(plain.declarations);
		}
		expect(
			rule('.classicyDesktopMenu > :has(> [data-classicy-part="extensions"])')[
				"margin-left"
			],
		).toBe("auto");
	});

	// The deprecated Sound widget is no longer drawn in the bar, but its sheet
	// sits beside the others and floated right too.
	it("no menu bar stylesheet floats right", () => {
		const dir = path.resolve(
			process.cwd(),
			"src/SystemFolder/SystemResources/Desktop/MenuBar",
		);
		const sheets = readdirSync(dir, {
			recursive: true,
			encoding: "utf8",
		}).filter((file) => file.endsWith(".scss"));
		expect(sheets.length).toBeGreaterThanOrEqual(3);
		for (const file of sheets)
			expect(readFileSync(path.join(dir, file), "utf8")).not.toMatch(
				/float:\s*right/,
			);
	});
});

describe("ClassicyDesktopMenuBar layout — clusters", () => {
	beforeEach(() => {
		useAppManager.setState(DefaultAppManagerState, true);
	});

	it("tags every cluster", () => {
		const { container } = render(<ClassicyDesktopMenuBar />);
		for (const part of ["apple", "help", "switcher", "extensions", "clock"])
			expect(
				container.querySelector(
					`.classicyDesktopMenu > [data-classicy-part="${part}"]`,
				),
			).not.toBeNull();
	});

	it("tags a published app menu as app", () => {
		setStore((draft) => {
			draft.System.Manager.Desktop.appMenu = [
				{
					id: "file",
					title: "File",
					menuChildren: [{ id: "new", title: "New" }],
				},
				{
					id: "edit",
					title: "Edit",
					menuChildren: [{ id: "undo", title: "Undo" }],
				},
			];
		});
		const { container } = render(<ClassicyDesktopMenuBar />);
		const apps = container.querySelectorAll(
			'.classicyDesktopMenu > [data-classicy-part="app"]',
		);
		expect(Array.from(apps, (li) => li.id)).toEqual(["file", "edit"]);
	});

	it("puts a balloon-wrapped app menu's wrapper on the bar, matched by its order rule", () => {
		setStore((draft) => {
			draft.System.Manager.Desktop.appMenu = [
				{
					id: "file",
					title: "File",
					balloon: { content: "File commands." },
					menuChildren: [{ id: "new", title: "New" }],
				},
			];
		});
		const { container } = render(<ClassicyDesktopMenuBar />);
		const li = container.querySelector('[data-classicy-part="app"]');
		const flexItem = li?.parentElement;
		expect(
			flexItem?.parentElement?.classList.contains("classicyDesktopMenu"),
		).toBe(true);
		expect(
			flexItem?.matches(
				'.classicyDesktopMenu > :has(> [data-classicy-part="app"])',
			),
		).toBe(true);
	});
});
