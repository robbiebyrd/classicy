import path from "node:path";
import * as sass from "sass";
import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyIcons } from "@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons";
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
		expect(glyph).toHaveAttribute("src", ClassicyIcons.ui.helpButton);
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
		expect(box.width).toBe("var(--help-button-width, 20px)");
		expect(box.height).toBe("var(--help-button-height, 21px)");
		expect(box["box-sizing"]).toBe("border-box");
		expect(box.padding).toBe("0");
		expect(box["min-width"]).toBe("0");
		expect(box["min-height"]).toBe("0");
	});

	it("keeps the 14 px glyph at native size and crisp", () => {
		const glyph = rule(
			".classicyBevelButton.classicyHelpButton .classicyBevelButtonIcon",
		);
		expect(glyph.width).toBe("14px");
		expect(glyph.height).toBe("14px");
		expect(glyph["image-rendering"]).toBe("pixelated");
	});
});
