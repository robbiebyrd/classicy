import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { scanPixelLiteralsInSource } from "../../../../bin/check-pixel-literals.ts";

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

// The anchor wraps the hovered element; the tooltip role is the balloon's.
const anchorOf = (child: HTMLElement) => child.parentElement as HTMLElement;

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
		fireEvent.mouseEnter(
			anchorOf(screen.getByRole("button", { name: "Open" })),
		);
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
		const anchor = anchorOf(screen.getByRole("button", { name: "Open" }));
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
		fireEvent.mouseEnter(
			anchorOf(screen.getByRole("button", { name: "Open" })),
		);
		expect(screen.queryByText("Opens the file.")).not.toBeInTheDocument();
	});

	it("renders nothing when balloon help is globally disabled", async () => {
		mockState.disableBalloonHelp = true;
		render(
			<ClassicyBalloonHelp content="Opens the file." delay={0}>
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		fireEvent.mouseEnter(
			anchorOf(screen.getByRole("button", { name: "Open" })),
		);
		await new Promise((resolve) => setTimeout(resolve, 10));
		expect(screen.queryByText("Opens the file.")).not.toBeInTheDocument();
	});

	it("gives the tooltip role to the balloon and describes the target with it (#310)", async () => {
		mockState.disableBalloonHelp = false;
		render(
			<ClassicyBalloonHelp content="Opens the file." delay={0}>
				<button type="button">Open</button>
			</ClassicyBalloonHelp>,
		);
		const anchor = anchorOf(screen.getByRole("button", { name: "Open" }));
		expect(screen.queryByRole("tooltip")).not.toBeInTheDocument();
		expect(anchor).not.toHaveAttribute("aria-describedby");
		fireEvent.mouseEnter(anchor);
		const tooltip = await screen.findByRole("tooltip");
		expect(tooltip).toHaveTextContent("Opens the file.");
		expect(anchor).toHaveAttribute("aria-describedby", tooltip.id);
	});
});

// The bubble and tail geometry are balloon-help knobs (measurements.balloonHelp,
// platinum.json), never pixel literals.
describe("ClassicyBalloonHelp stylesheet", () => {
	it("no bare literal", () =>
		expect(
			scanPixelLiteralsInSource(
				readFileSync(resolve(__dirname, "ClassicyBalloonHelp.scss"), "utf8"),
				"ClassicyBalloonHelp.scss",
			).filter((literal) => literal.kind === "bare"),
		).toEqual([]));
});
