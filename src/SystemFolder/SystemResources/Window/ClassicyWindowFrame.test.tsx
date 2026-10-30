import { describe, expect, it, vi } from "vitest";
import { compileScss, scssRule } from "@/__tests__/compiledCss";
import { render, screen } from "@/__tests__/test-utils";
import { ClassicyWindowFrame } from "@/SystemFolder/SystemResources/Window/ClassicyWindowFrame";

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss",
	() => ({}),
);

describe("ClassicyWindowFrame", () => {
	it("renders title and children with no provider", () => {
		const { container } = render(
			<ClassicyWindowFrame title="9/11 in Realtime">
				<p>About text</p>
			</ClassicyWindowFrame>,
		);
		expect(container.querySelector(".classicyWindowFrame")).toBeInTheDocument();
		expect(screen.getByText("9/11 in Realtime")).toBeInTheDocument();
		expect(screen.getByText("About text")).toBeInTheDocument();
	});

	it("omits the title text node when no title is given", () => {
		const { container } = render(
			<ClassicyWindowFrame>
				<span>body</span>
			</ClassicyWindowFrame>,
		);
		expect(container.querySelector(".classicyWindowTitleText")).toBeNull();
	});

	it("draws the shared title bar", () => {
		const { container } = render(
			<ClassicyWindowFrame title="Welcome">
				<span>body</span>
			</ClassicyWindowFrame>,
		);
		expect(
			container.querySelector(".classicyWindowFrame > .classicyWindowTitleBar"),
		).not.toBeNull();
		expect(
			container.querySelector(
				".classicyWindowTitleBar .classicyWindowTitleText",
			),
		).toHaveTextContent("Welcome");
	});

	it("applies a custom className to the root", () => {
		const { container } = render(
			<ClassicyWindowFrame className="myFrame">
				<span>body</span>
			</ClassicyWindowFrame>,
		);
		expect(container.querySelector(".classicyWindowFrame")).toHaveClass(
			"myFrame",
		);
	});

	it("exposes a numeric width as a px CSS custom property", () => {
		const { container } = render(
			<ClassicyWindowFrame width={480}>
				<span>body</span>
			</ClassicyWindowFrame>,
		);
		const root = container.querySelector(".classicyWindowFrame") as HTMLElement;
		expect(root.style.getPropertyValue("--classicy-window-frame-width")).toBe(
			"480px",
		);
	});

	// Named change (a): the shared title bar sits inset as a window's does,
	// but on whole pixels, so the body below moves by a whole number of
	// pixels and rasters exactly as before, only lower.
	it("insets the title bar by a whole-pixel frame ring and rules it off", () => {
		const bar = scssRule(
			compileScss(
				"src/SystemFolder/SystemResources/Window/ClassicyWindowFrame.scss",
			),
			".classicyWindowFrame > .classicyWindowTitleBar",
		);
		expect(bar.padding).toBe(
			"round(down, var(--window-padding-size) / 1.25, 1px)",
		);
		expect(bar["padding-bottom"]).toBe("var(--window-border-size)");
		expect(bar["border-bottom"]).toBe(
			"var(--window-border-size) solid var(--color-black)",
		);
	});
});
