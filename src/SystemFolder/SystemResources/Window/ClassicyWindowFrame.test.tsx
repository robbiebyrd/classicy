import { describe, expect, it, vi } from "vitest";
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
		expect(
			container.querySelector(".classicyWindowFrame"),
		).toBeInTheDocument();
		expect(screen.getByText("9/11 in Realtime")).toBeInTheDocument();
		expect(screen.getByText("About text")).toBeInTheDocument();
	});

	it("omits the title text node when no title is given", () => {
		const { container } = render(
			<ClassicyWindowFrame>
				<span>body</span>
			</ClassicyWindowFrame>,
		);
		expect(
			container.querySelector(".classicyWindowFrameTitleText"),
		).toBeNull();
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
		const root = container.querySelector(
			".classicyWindowFrame",
		) as HTMLElement;
		expect(root.style.getPropertyValue("--classicy-window-frame-width")).toBe(
			"480px",
		);
	});
});
