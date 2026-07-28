import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";

const mockState = vi.hoisted(() => ({ disableBalloonHelp: false }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: {
						Desktop: { disableBalloonHelp: mockState.disableBalloonHelp },
					},
				},
			}),
	}),
);

import {
	type ClassicyIconBalloonHelp,
	useClassicyBalloonHelp,
} from "@/SystemFolder/SystemResources/BalloonHelp/useClassicyBalloonHelp";

const Harness = ({ config }: { config?: ClassicyIconBalloonHelp }) => {
	const ref = useRef<HTMLDivElement>(null);
	const { handlers, balloon } = useClassicyBalloonHelp(ref, config);
	return (
		<div ref={ref} data-testid="anchor" {...handlers}>
			anchor
			{balloon}
		</div>
	);
};

describe("useClassicyBalloonHelp", () => {
	it("shows the balloon on hover after the delay", async () => {
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		expect(await screen.findByText("Drag items here.")).toBeInTheDocument();
	});

	it("adds no DOM around the anchor element", () => {
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		expect(screen.getByTestId("anchor")).not.toHaveClass(
			"classicyBalloonHelpAnchor",
		);
	});

	it("returns a null balloon when no config is supplied", async () => {
		mockState.disableBalloonHelp = false;
		render(<Harness />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
	});

	it("returns a null balloon when balloon help is globally disabled", async () => {
		mockState.disableBalloonHelp = true;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
	});

	it("hides the balloon on mouse leave", async () => {
		mockState.disableBalloonHelp = false;
		render(<Harness config={{ content: "Drag items here.", delay: 0 }} />);
		const anchor = screen.getByTestId("anchor");
		fireEvent.mouseEnter(anchor);
		expect(await screen.findByText("Drag items here.")).toBeInTheDocument();
		fireEvent.mouseLeave(anchor);
		expect(screen.queryByText("Drag items here.")).not.toBeInTheDocument();
	});

	it("renders the title when supplied", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<Harness
				config={{ title: "Trash", content: "Drag items here.", delay: 0 }}
			/>,
		);
		fireEvent.mouseEnter(screen.getByTestId("anchor"));
		expect(await screen.findByText("Trash")).toBeInTheDocument();
	});
});
