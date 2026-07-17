import { describe, expect, it, vi } from "vitest";
import { render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyPlacard } from "@/SystemFolder/SystemResources/Placard/ClassicyPlacard";

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => vi.fn(),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Placard/ClassicyPlacard.scss",
	() => ({}),
);

describe("ClassicyPlacard", () => {
	it("renders static content as a non-button div by default", () => {
		render(<ClassicyPlacard>24 items</ClassicyPlacard>);
		expect(screen.getByText("24 items")).toBeInTheDocument();
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("reports the normal state by default", () => {
		const { container } = render(<ClassicyPlacard>Info</ClassicyPlacard>);
		expect(container.querySelector(".classicyPlacard")).toHaveAttribute(
			"data-state",
			"normal",
		);
	});

	it("renders a button and fires onClick when clickable", async () => {
		const user = userEvent.setup();
		const onClick = vi.fn();
		render(<ClassicyPlacard onClick={onClick}>Go</ClassicyPlacard>);
		const btn = screen.getByRole("button", { name: "Go" });
		await user.click(btn);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("shows disabled state and does not become interactive", () => {
		const { container } = render(
			<ClassicyPlacard disabled={true} onClick={vi.fn()}>
				Off
			</ClassicyPlacard>,
		);
		expect(container.querySelector(".classicyPlacard")).toHaveAttribute(
			"data-state",
			"disabled",
		);
		expect(screen.queryByRole("button")).not.toBeInTheDocument();
	});

	it("opens a pop-up menu and fires onSelect with the chosen id", async () => {
		const user = userEvent.setup();
		const onSelect = vi.fn();
		render(
			<ClassicyPlacard
				onSelect={onSelect}
				menuItems={[
					{ id: "50", title: "50%" },
					{ id: "100", title: "100%" },
				]}
			>
				100%
			</ClassicyPlacard>,
		);
		const trigger = screen.getByRole("button", { name: /100%/ });
		expect(trigger).toHaveAttribute("aria-haspopup", "menu");
		expect(trigger).toHaveAttribute("aria-expanded", "false");

		await user.click(trigger);
		expect(trigger).toHaveAttribute("aria-expanded", "true");

		await user.click(screen.getByRole("menuitem", { name: "50%" }));
		expect(onSelect).toHaveBeenCalledWith("50");
		// Menu closes after a selection.
		expect(screen.queryByRole("menu")).not.toBeInTheDocument();
	});
});
