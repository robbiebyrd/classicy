import { beforeEach, describe, expect, it, vi } from "vitest";
import {
	type CompiledCssRule,
	compileScss,
	parseCssRules,
} from "@/__tests__/compiledCss";
import { render } from "@/__tests__/test-utils";
import { windowsRecord } from "@/__tests__/windowsRecord";
import { ClassicyMenu } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

/**
 * Base SCSS carries a component's structure and an Appearance Package only
 * its look (story 0088-sz9, the Part B ruling R10 follow-up). Rendered under a
 * package with empty CSS, as the Storybook probe package renders its
 * AppearanceHooks stories, the window control boxes (their size and the
 * geometry of the `::before` and `::after` boxes the depressable control box
 * draws its dither and glyph in) and the menu dividers keep the structure
 * they have under Platinum.
 *
 * jsdom does no cascade, so this resolves it: the real components are
 * rendered, then, for each element (or pseudo-element), every compiled rule
 * whose selector it matches is collected and the winner taken by layer (the
 * package layer beats the base layer), then specificity, then source order.
 * The no-package render reads the base sheets alone; the Platinum render adds
 * `platinum.scss`, its rules scoped under the desktop root.
 */

const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Desktop: { doubleClickTitleToCollapse: true },
						Applications: {
							apps: {
								TestApp: {
									id: "TestApp",
									focused: true,
									windows: windowsRecord({
										id: "TestWindow",
										appId: "TestApp",
										collapsed: false,
										focused: true,
										dragging: false,
										moving: false,
										resizing: false,
										zoomed: false,
										closed: false,
										size: [350, 200] as [number, number],
										position: [110, 110] as [number, number],
										minimumSize: [0, 0] as [number, number],
										menuBar: [] as unknown[],
										default: false,
									}),
								},
							},
						},
					},
				},
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({ useSoundDispatch: () => vi.fn() }),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { files: { file: "file.png" } } },
}));

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);
vi.mock("@/SystemFolder/SystemResources/Menu/ClassicyMenu.scss", () => ({}));

// The base sheets of the rendered parts, in bundle order (the separator's
// own sheet is imported by the menu, and the menu's before the window's).
const BASE = [
	"src/SystemFolder/SystemResources/Separator/ClassicySeparator.scss",
	"src/SystemFolder/SystemResources/Menu/ClassicyMenu.scss",
	"src/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
].flatMap((file) => parseCssRules(compileScss(file)));

const PLATINUM = parseCssRules(
	compileScss("packages/appearance/platinum/src/styles/platinum.scss"),
);

type Layer = { rules: CompiledCssRule[] };
const NO_PACKAGE: Layer[] = [{ rules: BASE }, { rules: [] }];
const WITH_PLATINUM: Layer[] = [{ rules: BASE }, { rules: PLATINUM }];

type Specificity = [number, number, number];

const compareSpecificity = (a: Specificity, b: Specificity) =>
	a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

/** Splits on top-level commas or spaces (not inside parentheses). */
const splitTopLevel = (value: string, separator: "," | " ") => {
	const parts: string[] = [];
	let depth = 0;
	let current = "";
	for (const ch of value) {
		if (ch === "(") depth++;
		if (ch === ")") depth--;
		if (ch === separator && depth === 0) {
			if (current.trim()) parts.push(current.trim());
			current = "";
		} else current += ch;
	}
	if (current.trim()) parts.push(current.trim());
	return parts;
};

/**
 * Selectors Level 4 specificity: `:where()` counts nothing, `:is()`,
 * `:not()` and `:has()` count their most specific argument.
 */
const specificity = (selector: string): Specificity => {
	const total: Specificity = [0, 0, 0];
	const add = ([a, b, c]: Specificity) => {
		total[0] += a;
		total[1] += b;
		total[2] += c;
	};
	let s = selector.replace(/:where\((?:[^()]|\([^()]*\))*\)/g, " ");
	s = s.replace(
		/:(?:is|not|has)\(((?:[^()]|\([^()]*\))*)\)/g,
		(_, inner: string) => {
			add(
				splitTopLevel(inner, ",")
					.map(specificity)
					.sort(compareSpecificity)
					.at(-1) ?? [0, 0, 0],
			);
			return " ";
		},
	);
	s = s.replace(/\[[^\]]*\]/g, () => {
		add([0, 1, 0]);
		return " ";
	});
	// The legacy single-colon pseudo-elements weigh as pseudo-elements.
	s = s.replace(/(?<!:):(?:before|after|first-line|first-letter)\b/g, () => {
		add([0, 0, 1]);
		return " ";
	});
	add([
		(s.match(/#[\w-]+/g) ?? []).length,
		(s.match(/\.[\w-]+|(?<!:):[\w-]+/g) ?? []).length,
		(s.match(/::[\w-]+|(?:^|[\s>+~])[a-z][\w-]*/gi) ?? []).length,
	]);
	return total;
};

/** Expands the box shorthands the resolved properties are compared through. */
const longhands = (prop: string, value: string): [string, string][] => {
	if (prop !== "margin" && prop !== "padding") return [[prop, value]];
	const [top, right = top, bottom = top, left = right] = splitTopLevel(
		value,
		" ",
	);
	return [
		[`${prop}-top`, top],
		[`${prop}-right`, right],
		[`${prop}-bottom`, bottom],
		[`${prop}-left`, left],
	];
};

const PSEUDO_ELEMENT = /::?(before|after)$/;

const KEYFRAME_STEP = /^(from|to|\d+(\.\d+)?%)$/;

/** Selectors jsdom could not match: the resolution would be unsound. */
const unmatchable: string[] = [];

/**
 * The cascaded value of each property on `el` (or its `::before`/`::after`),
 * through `layers` (a later layer beats an earlier one).
 */
const cascade = (
	el: Element,
	pseudo: "before" | "after" | null,
	layers: Layer[],
): Record<string, string> => {
	const winners: Record<
		string,
		{ value: string; rank: [number, Specificity, number] }
	> = {};
	let order = 0;
	layers.forEach(({ rules }, layer) => {
		for (const rule of rules) {
			order++;
			// parseCssRules splits a list on every ", ", inside :where() too.
			const selectors = splitTopLevel(rule.selectors.join(", "), ",");
			// A @keyframes step is not a selector.
			if (selectors.every((s) => KEYFRAME_STEP.test(s))) continue;
			const { body } = rule;
			let best: Specificity | null = null;
			for (const selector of selectors) {
				const own = selector.match(PSEUDO_ELEMENT)?.[1] ?? null;
				if (own !== pseudo) continue;
				const host = selector.replace(PSEUDO_ELEMENT, "");
				// Another pseudo-element (scroll-bar parts, ::selection, ::marker).
				if (host.includes("::")) continue;
				let matches = false;
				try {
					matches = el.matches(host);
				} catch {
					unmatchable.push(host);
				}
				if (!matches) continue;
				const weight = specificity(selector);
				if (!best || compareSpecificity(weight, best) > 0) best = weight;
			}
			if (!best) continue;
			for (const line of body.split(";\n")) {
				const colon = line.indexOf(":");
				if (colon <= 0) continue;
				const prop = line.slice(0, colon).trim();
				const value = line
					.slice(colon + 1)
					.trim()
					.replace(/;$/, "");
				for (const [longhand, v] of longhands(prop, value)) {
					const rank: [number, Specificity, number] = [layer, best, order];
					const held = winners[longhand];
					if (
						!held ||
						rank[0] > held.rank[0] ||
						(rank[0] === held.rank[0] &&
							(compareSpecificity(rank[1], held.rank[1]) > 0 ||
								(compareSpecificity(rank[1], held.rank[1]) === 0 &&
									rank[2] >= held.rank[2])))
					)
						winners[longhand] = { value: v, rank };
				}
			}
		}
	});
	return Object.fromEntries(
		Object.entries(winners).map(([prop, { value }]) => [prop, value]),
	);
};

/** `props` of `el` (or its pseudo-element), as cascaded through `layers`. */
const resolved = (
	el: Element,
	pseudo: "before" | "after" | null,
	props: string[],
	layers: Layer[],
) => {
	const all = cascade(el, pseudo, layers);
	return Object.fromEntries(props.map((p) => [p, all[p]]));
};

/**
 * Renders `ui` inside a desktop root under `packageId`, the attribute every
 * package rule is scoped by.
 */
const renderUnder = (ui: React.ReactElement) => {
	const desktop = document.createElement("div");
	desktop.className = "classicyDesktop";
	document.body.appendChild(desktop);
	const result = render(ui, { container: desktop });
	const setPackage = (packageId: string) =>
		desktop.setAttribute("data-classicy-appearance", packageId);
	return { ...result, desktop, setPackage };
};

/**
 * Asserts `expected` for `el` (or its pseudo-element) both under a package
 * with empty CSS and under Platinum.
 */
const expectStructure = (
	setPackage: (id: string) => void,
	el: Element,
	pseudo: "before" | "after" | null,
	expected: Record<string, string>,
) => {
	const props = Object.keys(expected);
	setPackage("storybook-probe");
	const bare = resolved(el, pseudo, props, NO_PACKAGE);
	setPackage("platinum");
	const platinum = resolved(el, pseudo, props, WITH_PLATINUM);
	expect({ noPackage: bare, platinum }).toEqual({
		noPackage: expected,
		platinum: expected,
	});
};

const BOX_GEOMETRY = (size: string) => ({
	width: `var(${size})`,
	height: `var(${size})`,
});

// The dither layer's box: the control box's content box.
const DITHER_BOX = {
	display: "block",
	width: "100%",
	height: "100%",
	content: '" "',
};

// The glyph box: in flow after the dither box, pulled back up over it.
const GLYPH_BOX = (top: string) => ({
	position: "relative",
	top,
	display: "block",
	width: "100%",
	height: "100%",
	content: '" "',
});

const DOCUMENT_GLYPH_TOP =
	"calc(var(--window-control-size) * -1 - var(--window-border-size))";

const BOXES = [
	"classicyWindowCloseBox",
	"classicyWindowZoomBox",
	"classicyWindowCollapseBox",
] as const;

describe("structure without an appearance package (story 0088-sz9)", () => {
	beforeEach(() => {
		document.body.replaceChildren();
		unmatchable.length = 0;
	});

	it("the resolver weighs :where, :is, attributes and pseudo-elements", () => {
		expect(specificity(":where(.a).b")).toEqual([0, 1, 0]);
		expect(specificity(".a:is(.b, #c) d::after")).toEqual([1, 1, 2]);
		expect(specificity('.r[data-x="y"] .a:after')).toEqual([0, 3, 1]);
		expect(specificity(".a::after")).toEqual(specificity(".a:after"));
	});

	it("a document window's control boxes keep their size and their dither and glyph boxes", () => {
		const { container, setPackage } = renderUnder(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Test"
				closable
				zoomable
				collapsable
			>
				<p>content</p>
			</ClassicyWindow>,
		);
		for (const box of BOXES) {
			const el = container.querySelector(`.${box}`);
			expect(el, box).not.toBeNull();
			if (!el) continue;
			expectStructure(
				setPackage,
				el,
				null,
				BOX_GEOMETRY("--window-control-size"),
			);
			expectStructure(setPackage, el, "before", DITHER_BOX);
			expectStructure(setPackage, el, "after", GLYPH_BOX(DOCUMENT_GLYPH_TOP));
		}
		expect(unmatchable).toEqual([]);
	});

	it("a windoid's close and collapse boxes keep their smaller size and glyph offset", () => {
		const { container, setPackage } = renderUnder(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Test"
				windowType="utility"
				closable
				collapsable
			>
				<p>content</p>
			</ClassicyWindow>,
		);
		const close = container.querySelector(".classicyWindowCloseBox");
		const collapse = container.querySelector(".classicyWindowCollapseBox");
		expect(close).not.toBeNull();
		expect(collapse).not.toBeNull();
		if (!close || !collapse) return;
		for (const el of [close, collapse])
			expectStructure(
				setPackage,
				el,
				null,
				BOX_GEOMETRY("--window-utility-control-box-size"),
			);
		expectStructure(setPackage, close, "after", GLYPH_BOX(DOCUMENT_GLYPH_TOP));
		expectStructure(
			setPackage,
			collapse,
			"after",
			GLYPH_BOX(
				"calc(var(--window-padding-size) * -1 - var(--window-border-size))",
			),
		);
		expect(unmatchable).toEqual([]);
	});

	it.each([
		"classicyMenu",
		"classicySubMenu",
		"classicyContextMenu",
		"classicyContextSubMenu",
	])("a divider in a %s spans the menu's full inner width", (navClass) => {
		const { container, setPackage } = renderUnder(
			<ClassicyMenu
				name="test-menu"
				navClass={navClass}
				menuItems={[
					{ id: "item-1", title: "New" },
					{ id: "spacer" },
					{ id: "item-2", title: "Open" },
				]}
			/>,
		);
		const divider = container.querySelector(".classicySeparatorHorizontal");
		expect(divider).not.toBeNull();
		if (!divider) return;
		expectStructure(setPackage, divider, null, {
			"align-self": "stretch",
			width: "auto",
			height: "var(--control-frame-width)",
			"margin-top": "var(--control-padding)",
			"margin-bottom": "var(--control-padding)",
			"margin-left": "calc(var(--window-border-size) * -1)",
			"margin-right": "calc(var(--window-border-size) * -1)",
		});
		expect(unmatchable).toEqual([]);
	});
});
