import path from "node:path";
import { createElement } from "react";
import * as sass from "sass";
import { describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyTabs } from "@/SystemFolder/SystemResources/Tabs/ClassicyTabs";

/**
 * The tab strip and its panel are orderable siblings in a flex column, so a
 * strip can sit below the panel (`stripPosition="bottom"`) without a second
 * DOM order. jsdom does no layout, so the arrangement is pinned on the
 * compiled stylesheet.
 */

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);
vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);
vi.mock("@/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss", () => ({}));

// vitest's root is the repo root, and jsdom leaves import.meta.url as a
// non-file URL, so resolve from the project root.
const css = sass.compile(
	path.resolve(
		process.cwd(),
		"src/SystemFolder/SystemResources/Tabs/ClassicyTabs.scss",
	),
	{ style: "expanded" },
).css;

// A selector can head more than one block, so merge every block it heads.
const rule = (selector: string): Record<string, string> => {
	const blocks = [
		...css.matchAll(
			new RegExp(
				`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([^}]*)\\n\\}`,
				"gm",
			),
		),
	];
	if (blocks.length === 0) throw new Error(`rule not found: ${selector}`);
	const declarations: Record<string, string> = {};
	for (const block of blocks) {
		for (const line of block[1].split("\n")) {
			const colon = line.indexOf(":");
			if (colon === -1) continue;
			declarations[line.slice(0, colon).trim()] = line
				.slice(colon + 1)
				.trim()
				.replace(/;$/, "");
		}
	}
	return declarations;
};

const tabs = [
	{ title: "First", children: createElement("p", null, "First content") },
	{ title: "Second", children: createElement("p", null, "Second content") },
];

describe("ClassicyTabs arrangement", () => {
	it("lays the strip and panel out as a flex column", () => {
		const container = rule(".classicyTabContainer");
		expect(container.display).toBe("flex");
		expect(container["flex-direction"]).toBe("column");
		expect(container["align-items"]).toBe("stretch");
	});

	it("moves the strip below the panel with order", () => {
		const row = rule(".classicyTabStripBottom .classicyTabButtonsRow");
		expect(row.order).toBe("1");
		expect(row["margin-bottom"]).toBe("0");
		expect(row["margin-top"]).toBe("calc(var(--window-border-size) * -1)");
		expect(row["align-items"]).toBe("flex-start");
	});

	it("marks the container when stripPosition is bottom", () => {
		const { container } = render(
			createElement(ClassicyTabs, { tabs, stripPosition: "bottom" }),
		);
		expect(container.querySelector(".classicyTabContainer")).toHaveClass(
			"classicyTabStripBottom",
		);
	});

	it("leaves the default strip on top, unmarked", () => {
		const { container } = render(createElement(ClassicyTabs, { tabs }));
		expect(container.querySelector(".classicyTabContainer")).not.toHaveClass(
			"classicyTabStripBottom",
		);
	});
});
