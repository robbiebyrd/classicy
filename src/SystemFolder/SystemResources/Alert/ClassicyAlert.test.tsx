import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

// Real ClassicyWindow + Button are used; only their external hooks are mocked so
// the modal renders (and portals to document.body) without a provider tree.
vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) =>
			selector({
				System: {
					Manager: { Applications: { apps: {} } },
				},
			}),
		useAppManagerDispatch: () => mockDispatch,
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/SoundManager/ClassicySoundManagerContext",
	() => ({
		useSoundDispatch: () => mockPlayer,
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Cursor/useClassicyCursor", () => ({
	useClassicyCursor: () => vi.fn(),
}));

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { files: { file: "file.png" } } },
}));

vi.mock("@/SystemFolder/SystemResources/Alert/ClassicyAlert.scss", () => ({}));
vi.mock("@/SystemFolder/SystemResources/Window/ClassicyWindow.scss", () => ({}));
vi.mock("@/SystemFolder/SystemResources/Button/ClassicyButton.scss", () => ({}));

describe("ClassicyAlert", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	it("renders the two-tier label and message text", () => {
		render(
			<ClassicyAlert
				alertType="note"
				label="Heading"
				message="Narrative body text."
			/>,
		);
		expect(screen.getByText("Heading")).toBeInTheDocument();
		expect(screen.getByText("Narrative body text.")).toBeInTheDocument();
	});

	it("shows the matching severity icon per alertType", () => {
		const { rerender } = render(
			<ClassicyAlert alertType="note" label="n" />,
		);
		expect(screen.getByRole("img", { name: "Note" })).toBeInTheDocument();

		rerender(<ClassicyAlert alertType="caution" label="c" />);
		expect(screen.getByRole("img", { name: "Caution" })).toBeInTheDocument();

		rerender(<ClassicyAlert alertType="stop" label="s" />);
		expect(screen.getByRole("img", { name: "Stop" })).toBeInTheDocument();
	});

	it("generates a single default OK button for note alerts", () => {
		render(<ClassicyAlert alertType="note" label="n" />);
		const buttons = screen.getAllByRole("button");
		expect(buttons).toHaveLength(1);
		expect(buttons[0]).toHaveTextContent("OK");
		expect(buttons[0]).toHaveClass("classicyButtonDefault");
	});

	it("generates Cancel + default Continue for caution alerts", () => {
		render(<ClassicyAlert alertType="caution" label="c" />);
		expect(
			screen.getByRole("button", { name: "Cancel" }),
		).not.toHaveClass("classicyButtonDefault");
		expect(screen.getByRole("button", { name: "Continue" })).toHaveClass(
			"classicyButtonDefault",
		);
	});

	it("fires the button's onClick and onClose when a button is clicked", async () => {
		const user = userEvent.setup();
		const onOk = vi.fn();
		const onClose = vi.fn();
		render(
			<ClassicyAlert
				alertType="note"
				label="n"
				buttons={[{ id: "ok", label: "OK", role: "default", onClick: onOk }]}
				onClose={onClose}
			/>,
		);
		await user.click(screen.getByRole("button", { name: "OK" }));
		expect(onOk).toHaveBeenCalledTimes(1);
		expect(onClose).toHaveBeenCalledTimes(1);
	});

	it("triggers the default button on Return (from a non-button focus)", () => {
		const onDefault = vi.fn();
		render(
			<ClassicyAlert
				alertType="caution"
				label="c"
				buttons={[
					{ id: "cancel", label: "Cancel", role: "cancel" },
					{ id: "ok", label: "OK", role: "default", onClick: onDefault },
				]}
			/>,
		);
		// Return fired while focus is NOT on a button routes to the dialog's
		// default action (a focused button keeps its own native activation).
		fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Enter" });
		expect(onDefault).toHaveBeenCalledTimes(1);
	});

	it("triggers the Cancel button on Escape", () => {
		const onCancel = vi.fn();
		render(
			<ClassicyAlert
				alertType="caution"
				label="c"
				buttons={[
					{ id: "cancel", label: "Cancel", role: "cancel", onClick: onCancel },
					{ id: "ok", label: "OK", role: "default" },
				]}
			/>,
		);
		fireEvent.keyDown(screen.getByRole("alertdialog"), { key: "Escape" });
		expect(onCancel).toHaveBeenCalledTimes(1);
	});

	it("honors defaultButtonId to move the default to the safe choice", () => {
		render(
			<ClassicyAlert
				alertType="caution"
				label="c"
				defaultButtonId="cancel"
				buttons={[
					{ id: "cancel", label: "Cancel", role: "cancel" },
					{ id: "discard", label: "Discard" },
				]}
			/>,
		);
		expect(screen.getByRole("button", { name: "Cancel" })).toHaveClass(
			"classicyButtonDefault",
		);
		expect(
			screen.getByRole("button", { name: "Discard" }),
		).not.toHaveClass("classicyButtonDefault");
	});

	it("caps the button set at four", () => {
		render(
			<ClassicyAlert
				alertType="caution"
				label="c"
				buttons={[
					{ id: "a", label: "A" },
					{ id: "b", label: "B" },
					{ id: "c", label: "C" },
					{ id: "d", label: "D" },
					{ id: "e", label: "E" },
				]}
			/>,
		);
		expect(screen.getAllByRole("button")).toHaveLength(4);
		expect(screen.queryByRole("button", { name: "E" })).not.toBeInTheDocument();
	});
});
