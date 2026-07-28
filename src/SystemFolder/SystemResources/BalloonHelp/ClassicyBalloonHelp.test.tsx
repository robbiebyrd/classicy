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

import { ClassicyBalloonHelp } from "@/SystemFolder/SystemResources/BalloonHelp/ClassicyBalloonHelp";

describe("ClassicyBalloonHelp", () => {
	it("renders its children inside an anchor element", () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyBalloonHelp content="Opens the file.">
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		const child = screen.getByRole("button", { name: "Open" });
		expect(child.parentElement).toHaveClass("classicyBalloonHelpAnchor");
	});

	it("shows title and content after the delay elapses", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyBalloonHelp title="Open" content="Opens the file." delay={0}>
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		fireEvent.mouseEnter(screen.getByRole("tooltip"));
		expect(await screen.findByText("Opens the file.")).toBeInTheDocument();
		expect(screen.getByText("Open", { selector: "p" })).toBeInTheDocument();
	});

	it("hides the balloon on mouse leave", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyBalloonHelp content="Opens the file." delay={0}>
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		const anchor = screen.getByRole("tooltip");
		fireEvent.mouseEnter(anchor);
		expect(await screen.findByText("Opens the file.")).toBeInTheDocument();
		fireEvent.mouseLeave(anchor);
		expect(screen.queryByText("Opens the file.")).not.toBeInTheDocument();
	});

	it("does not show the balloon before the delay elapses", () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyBalloonHelp content="Opens the file.">
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		fireEvent.mouseEnter(screen.getByRole("tooltip"));
		expect(screen.queryByText("Opens the file.")).not.toBeInTheDocument();
	});

	it("renders nothing when balloon help is globally disabled", async () => {
		mockState.disableBalloonHelp = true;
		render(
			<ClassicyBalloonHelp content="Opens the file." delay={0}>
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		fireEvent.mouseEnter(screen.getByRole("tooltip"));
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByText("Opens the file.")).not.toBeInTheDocument();
	});
});
