import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyBevelButton } from "@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton";

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

vi.mock(
	"@/SystemFolder/SystemResources/BevelButton/ClassicyBevelButton.scss",
	() => ({}),
);

describe("ClassicyBevelButton", () => {
	it("renders text content", () => {
		render(<ClassicyBevelButton>Tool</ClassicyBevelButton>);
		expect(screen.getByRole("button", { name: "Tool" })).toBeInTheDocument();
	});

	it("defaults to the off state and medium bevel", () => {
		render(<ClassicyBevelButton>Tool</ClassicyBevelButton>);
		const btn = screen.getByRole("button", { name: "Tool" });
		expect(btn).toHaveAttribute("data-state", "off");
		expect(btn).toHaveClass("classicyBevelButtonBevelMedium");
	});

	it("maps bevelWidth to the correct class", () => {
		render(<ClassicyBevelButton bevelWidth="small">S</ClassicyBevelButton>);
		expect(screen.getByRole("button", { name: "S" })).toHaveClass(
			"classicyBevelButtonBevelSmall",
		);
	});

	it("fires onClickFunc on click", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(<ClassicyBevelButton onClickFunc={onClick}>Go</ClassicyBevelButton>);
		await user.click(screen.getByRole("button", { name: "Go" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("toggle mode flips the on-state and fires onChangeFunc", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ClassicyBevelButton mode="toggle" onChangeFunc={onChange}>
				Bold
			</ClassicyBevelButton>,
		);
		const btn = screen.getByRole("button", { name: "Bold" });
		expect(btn).toHaveAttribute("data-state", "off");
		await user.click(btn);
		expect(onChange).toHaveBeenCalledWith(true);
		expect(btn).toHaveAttribute("data-state", "on");
	});

	it("radio mode turns on and stays on (never toggles back off)", async () => {
		const user = userEvent.setup();
		const onChange = vi.fn();
		render(
			<ClassicyBevelButton mode="radio" onChangeFunc={onChange}>
				Left
			</ClassicyBevelButton>,
		);
		const btn = screen.getByRole("radio", { name: "Left" });
		await user.click(btn);
		expect(btn).toHaveAttribute("aria-checked", "true");
		await user.click(btn);
		// Only the first click changed state.
		expect(onChange).toHaveBeenCalledTimes(1);
		expect(btn).toHaveAttribute("data-state", "on");
	});

	it("reports the mixed state", () => {
		render(
			<ClassicyBevelButton mode="toggle" mixed={true}>
				Mixed
			</ClassicyBevelButton>,
		);
		const btn = screen.getByRole("button", { name: "Mixed" });
		expect(btn).toHaveAttribute("data-state", "mixed");
		expect(btn).toHaveAttribute("aria-pressed", "mixed");
	});

	it("computes disabled-off and disabled-on states and blocks clicks", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		const { rerender } = render(
			<ClassicyBevelButton disabled={true} onClickFunc={onClick}>
				Off
			</ClassicyBevelButton>,
		);
		const btn = screen.getByRole("button", { name: "Off" });
		expect(btn).toBeDisabled();
		expect(btn).toHaveAttribute("data-state", "disabled-off");
		await user.click(btn);
		expect(onClick).not.toHaveBeenCalled();

		rerender(
			<ClassicyBevelButton disabled={true} on={true} mode="toggle">
				On
			</ClassicyBevelButton>,
		);
		expect(screen.getByRole("button", { name: "On" })).toHaveAttribute(
			"data-state",
			"disabled-on",
		);
	});

	it("popup mode shows a pop-up arrow and sets aria-haspopup", () => {
		render(
			<ClassicyBevelButton mode="popup" popupArrow="large">
				100%
			</ClassicyBevelButton>,
		);
		const btn = screen.getByRole("button", { name: "100%" });
		expect(btn).toHaveAttribute("aria-haspopup", "menu");
		expect(btn.querySelector(".classicyBevelButtonArrow")).toBeInTheDocument();
	});

	it("renders an icon image when icon is provided", () => {
		render(
			<ClassicyBevelButton icon="data:image/gif;base64,R0lGOD" iconAlt="Cut">
				{""}
			</ClassicyBevelButton>,
		);
		expect(screen.getByAltText("Cut")).toBeInTheDocument();
	});
});
