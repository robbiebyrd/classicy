import { createRef } from "react";
import { describe, expect, it, vi } from "vitest";
import {
	act,
	fireEvent,
	render,
	screen,
	userEvent,
} from "@/__tests__/test-utils";
import { ClassicyButton } from "@/SystemFolder/SystemResources/Button/ClassicyButton";

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
	"@/SystemFolder/SystemResources/Button/ClassicyButton.scss",
	() => ({}),
);

describe("ClassicyButton", () => {
	it("renders button with children as text", () => {
		render(<ClassicyButton>Click me</ClassicyButton>);
		expect(
			screen.getByRole("button", { name: "Click me" }),
		).toBeInTheDocument();
	});

	it("calls onClickFunc when clicked", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(<ClassicyButton onClickFunc={onClick}>Action</ClassicyButton>);
		await user.click(screen.getByRole("button", { name: "Action" }));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("respects disabled prop — button is disabled and click does not fire", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(
			<ClassicyButton disabled={true} onClickFunc={onClick}>
				Disabled
			</ClassicyButton>,
		);
		const btn = screen.getByRole("button", { name: "Disabled" });
		expect(btn).toBeDisabled();
		await user.click(btn);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("adds classicyButtonDefault class when isDefault=true", () => {
		render(<ClassicyButton isDefault={true}>OK</ClassicyButton>);
		expect(screen.getByRole("button", { name: "OK" })).toHaveClass(
			"classicyButtonDefault",
		);
	});

	it("does not add classicyButtonDefault class when isDefault=false (default)", () => {
		render(<ClassicyButton>Cancel</ClassicyButton>);
		expect(screen.getByRole("button", { name: "Cancel" })).not.toHaveClass(
			"classicyButtonDefault",
		);
	});

	it('has type="button" by default', () => {
		render(<ClassicyButton>Submit</ClassicyButton>);
		expect(screen.getByRole("button", { name: "Submit" })).toHaveAttribute(
			"type",
			"button",
		);
	});

	it("uses the provided buttonType", () => {
		render(<ClassicyButton buttonType="submit">Go</ClassicyButton>);
		// role is set to the buttonType value in the component
		const btn = document.querySelector('button[type="submit"]');
		expect(btn).toBeInTheDocument();
	});

	it("defaults to md padding and margin classes", () => {
		render(<ClassicyButton>Default</ClassicyButton>);
		const btn = screen.getByRole("button", { name: "Default" });
		expect(btn).toHaveClass("classicyButtonPaddingMd");
		expect(btn).toHaveClass("classicyButtonMarginMd");
	});

	it("applies the requested padding variant", () => {
		render(<ClassicyButton padding="lg">Pad</ClassicyButton>);
		const btn = screen.getByRole("button", { name: "Pad" });
		expect(btn).toHaveClass("classicyButtonPaddingLg");
		expect(btn).not.toHaveClass("classicyButtonPaddingMd");
	});

	it("applies the requested margin variant", () => {
		render(<ClassicyButton margin="xl">Marg</ClassicyButton>);
		const btn = screen.getByRole("button", { name: "Marg" });
		expect(btn).toHaveClass("classicyButtonMarginXl");
		expect(btn).not.toHaveClass("classicyButtonMarginMd");
	});

	it("omits any padding class on square buttons but keeps the margin class", () => {
		render(
			<ClassicyButton buttonShape="square" padding="lg" margin="lg">
				Sq
			</ClassicyButton>,
		);
		const btn = screen.getByRole("button", { name: "Sq" });
		expect(btn.className).not.toMatch(/classicyButtonPadding/);
		expect(btn).toHaveClass("classicyButtonMarginLg");
	});

	it("forwards aria-label to the underlying button element", () => {
		render(<ClassicyButton aria-label="Remove file.png">✕</ClassicyButton>);
		expect(
			screen.getByRole("button", { name: "Remove file.png" }),
		).toBeInTheDocument();
	});

	it("forwards a ref to the underlying button element (so a dialog can bind it as default)", () => {
		const ref = createRef<HTMLButtonElement>();
		render(
			<ClassicyButton ref={ref} isDefault={true}>
				OK
			</ClassicyButton>,
		);
		expect(ref.current).toBeInstanceOf(HTMLButtonElement);
		expect(ref.current).toHaveClass("classicyButtonDefault");
	});

	it("adds a transient keyboard-activation highlight on Enter and clears it (~8 ticks)", () => {
		vi.useFakeTimers();
		try {
			render(<ClassicyButton>Go</ClassicyButton>);
			const btn = screen.getByRole("button", { name: "Go" });
			expect(btn).not.toHaveClass("classicyButtonKeyActive");

			fireEvent.keyDown(btn, { key: "Enter" });
			expect(btn).toHaveClass("classicyButtonKeyActive");
			expect(btn).toHaveAttribute("aria-pressed", "true");

			act(() => {
				vi.advanceTimersByTime(200);
			});
			expect(btn).not.toHaveClass("classicyButtonKeyActive");
		} finally {
			vi.useRealTimers();
		}
	});

	it("also highlights on Space activation", () => {
		vi.useFakeTimers();
		try {
			render(<ClassicyButton>Go</ClassicyButton>);
			const btn = screen.getByRole("button", { name: "Go" });
			fireEvent.keyDown(btn, { key: " " });
			expect(btn).toHaveClass("classicyButtonKeyActive");
			act(() => {
				vi.advanceTimersByTime(200);
			});
			expect(btn).not.toHaveClass("classicyButtonKeyActive");
		} finally {
			vi.useRealTimers();
		}
	});

	it("does not highlight from the keyboard when disabled", () => {
		render(<ClassicyButton disabled={true}>Nope</ClassicyButton>);
		const btn = screen.getByRole("button", { name: "Nope" });
		fireEvent.keyDown(btn, { key: "Enter" });
		expect(btn).not.toHaveClass("classicyButtonKeyActive");
	});

	it("still forwards a consumer onKeyDown handler", () => {
		const onKeyDown = vi.fn();
		render(<ClassicyButton onKeyDown={onKeyDown}>Go</ClassicyButton>);
		fireEvent.keyDown(screen.getByRole("button", { name: "Go" }), {
			key: "Enter",
		});
		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});
});
