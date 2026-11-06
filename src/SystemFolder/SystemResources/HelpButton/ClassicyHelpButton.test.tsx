import path from "node:path";
import * as sass from "sass";
import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { classicyCascadeWinner } from "@/Appearance/__tests__/classicyCascadeWinner";
import "../../../../packages/appearance/platinum/src/assets/platinumAssets";
import { resolveClassicyAsset } from "@/Appearance/ClassicyAssetRegistry";
import { ClassicyButtonToolbar } from "@/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar";
import { ClassicyHelpButton } from "@/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton";

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

describe("ClassicyHelpButton", () => {
	it("is a small-bevel button named Help that shows only the help glyph", () => {
		render(<ClassicyHelpButton />);
		const button = screen.getByRole("button", { name: "Help" });
		expect(button).toHaveClass(
			"classicyBevelButton",
			"classicyBevelButtonBevelSmall",
			"classicyHelpButton",
		);
		// No visible text: the glyph is the whole face.
		expect(button).toHaveTextContent("");
		const glyph = button.querySelector("img");
		// The registered system art (Platinum's own file, plan 0015-kxa §3.3).
		expect(glyph).toHaveAttribute(
			"src",
			resolveClassicyAsset("systemArt", "helpButton"),
		);
		expect(glyph?.getAttribute("src")).toMatch(/help-button\.png$/);
		// Decorative — the button's aria-label carries the name.
		expect(glyph).toHaveAttribute("alt", "");
	});

	it("takes a custom accessible name", () => {
		render(<ClassicyHelpButton label="Help with Sharing" />);
		expect(
			screen.getByRole("button", { name: "Help with Sharing" }),
		).toBeInTheDocument();
	});

	it("calls onClickFunc when clicked", async () => {
		const onClick = vi.fn();
		render(<ClassicyHelpButton onClickFunc={onClick} />);
		await userEvent.setup().click(screen.getByRole("button", { name: "Help" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("does not fire when disabled", async () => {
		const onClick = vi.fn();
		render(<ClassicyHelpButton onClickFunc={onClick} disabled />);
		const button = screen.getByRole("button", { name: "Help" });
		expect(button).toBeDisabled();
		await userEvent.setup().click(button);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("keeps a consumer className alongside its own", () => {
		render(<ClassicyHelpButton className="myHelp" />);
		expect(screen.getByRole("button", { name: "Help" })).toHaveClass(
			"classicyHelpButton",
			"myHelp",
		);
	});
});

describe("ClassicyHelpButton geometry (HIGOS8 p.86)", () => {
	// jsdom does no layout, so check the compiled rule instead: the box is the
	// HIG's 20 × 21, read from the theme's help-button metrics, with no padding or
	// minimum size from the bevel button left to push it off that size.
	const css = sass.compile(
		path.resolve(
			process.cwd(),
			"src/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton.scss",
		),
		{ style: "expanded" },
	).css;
	const rule = (selector: string) => {
		const match = css.match(
			new RegExp(
				`^${selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} \\{\\n([^}]*)\\n\\}`,
				"m",
			),
		);
		if (!match) throw new Error(`rule not found: ${selector}`);
		return Object.fromEntries(
			match[1]
				.split("\n")
				.filter((line) => line.includes(":"))
				.map((line) => {
					const colon = line.indexOf(":");
					return [
						line.slice(0, colon).trim(),
						line
							.slice(colon + 1)
							.trim()
							.replace(/;$/, ""),
					];
				}),
		);
	};

	it("is sized by the theme's help-button metrics", () => {
		const box = rule(".classicyBevelButton.classicyHelpButton");
		expect(box.width).toBe("var(--help-button-width)");
		expect(box.height).toBe("var(--help-button-height)");
		expect(box["box-sizing"]).toBe("border-box");
		expect(box.padding).toBe("0");
		expect(box["min-width"]).toBe("0");
		expect(box["min-height"]).toBe("0");
	});

	it("keeps the 14 px glyph at native size and crisp", () => {
		const glyph = rule(
			".classicyBevelButton.classicyHelpButton .classicyBevelButtonIcon",
		);
		// helpButton.glyphSize (platinum.json): the glyph art's native 14 px.
		expect(glyph.width).toBe("var(--help-button-glyph-size)");
		expect(glyph.height).toBe("var(--help-button-glyph-size)");
		expect(glyph["image-rendering"]).toBe("pixelated");
	});
});

// In a toolbar a help button is icon-only, so square, and takes the toolbar's
// square box like the controls beside it (the medium and small sizes always
// did; a large toolbar used to leave it to stylesheet order, which drew the
// base square width). Outside a toolbar it keeps the HIG's 20 px.
describe("ClassicyHelpButton width in a toolbar", () => {
	const SHEETS = [
		"src/SystemFolder/SystemResources/HelpButton/ClassicyHelpButton.scss",
		"src/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss",
		"src/SystemFolder/SystemResources/ButtonToolbar/ClassicyButtonToolbar.scss",
	];
	const orders = SHEETS.flatMap((a) =>
		SHEETS.filter((b) => b !== a).map((b) => [
			a,
			b,
			...SHEETS.filter((c) => c !== a && c !== b),
		]),
	);

	it.each([
		["large", "var(--button-square-width)"],
		["medium", "var(--button-toolbar-square-button-width)"],
		["small", "var(--control-square-size)"],
	] as const)("is the %s toolbar's square width in any stylesheet order", (size, expected) => {
		render(
			<ClassicyButtonToolbar size={size}>
				<ClassicyHelpButton />
			</ClassicyButtonToolbar>,
		);
		const button = screen.getByRole("button", { name: "Help" });
		expect(button).toHaveClass("classicyBevelButtonSquare");
		for (const order of orders)
			expect(classicyCascadeWinner(button, order, "width")?.value).toBe(
				expected,
			);
	});

	it("keeps the HIG width outside a toolbar in any stylesheet order", () => {
		render(<ClassicyHelpButton />);
		const button = screen.getByRole("button", { name: "Help" });
		for (const order of orders)
			expect(classicyCascadeWinner(button, order, "width")?.value).toBe(
				"var(--help-button-width)",
			);
	});
});
