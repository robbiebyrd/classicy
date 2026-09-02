import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, userEvent } from "@/__tests__/test-utils";
import { ClassicyAlert } from "@/SystemFolder/SystemResources/Alert/ClassicyAlert";
import {
	clampWindowPositionToViewport,
	resolvePosition,
} from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

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
		useClassicyAnalytics: () => ({ track: vi.fn(), page: vi.fn() }),
	}),
);

vi.mock("@/SystemFolder/SystemResources/Cursor/useClassicyCursor", () => ({
	useClassicyCursor: () => vi.fn(),
}));

vi.mock("@/SystemFolder/ControlPanels/AppearanceManager/ClassicyIcons", () => ({
	ClassicyIcons: { system: { files: { file: "file.png" } } },
}));

vi.mock("@/SystemFolder/SystemResources/Alert/ClassicyAlert.scss", () => ({}));
vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);
vi.mock(
	"@/SystemFolder/SystemResources/Button/ClassicyButton.scss",
	() => ({}),
);

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
		const { rerender } = render(<ClassicyAlert alertType="note" label="n" />);
		expect(screen.getByRole("img", { name: "Info" })).toBeInTheDocument();

		rerender(<ClassicyAlert alertType="caution" label="c" />);
		expect(screen.getByRole("img", { name: "Caution" })).toBeInTheDocument();

		rerender(<ClassicyAlert alertType="stop" label="s" />);
		expect(screen.getByRole("img", { name: "Error" })).toBeInTheDocument();
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
		expect(screen.getByRole("button", { name: "Cancel" })).not.toHaveClass(
			"classicyButtonDefault",
		);
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
		expect(screen.getByRole("button", { name: "Discard" })).not.toHaveClass(
			"classicyButtonDefault",
		);
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

	// ClassicyAlert is always modal={true} — ClassicyWindow's cleanup effect
	// must dispatch ClassicyWindowDestroy for it on unmount (#222/#223). A real
	// in-repo caller passes a real app id (not the "ClassicyAlert" default), so
	// this pins that shape too.
	it("dispatches ClassicyWindowDestroy for itself on unmount", () => {
		const { unmount } = render(
			<ClassicyAlert
				id="confirm-delete"
				appId="Finder.app"
				alertType="caution"
				label="Delete this file?"
			/>,
		);
		const destroyCallsBeforeUnmount = mockDispatch.mock.calls.filter(
			(c) => (c[0] as { type: string }).type === "ClassicyWindowDestroy",
		);
		expect(destroyCallsBeforeUnmount).toHaveLength(0);

		unmount();

		const destroyCalls = mockDispatch.mock.calls.filter(
			(c) => (c[0] as { type: string }).type === "ClassicyWindowDestroy",
		);
		expect(destroyCalls).toHaveLength(1);
		expect(destroyCalls[0][0]).toMatchObject({
			type: "ClassicyWindowDestroy",
			app: { id: "Finder.app" },
			window: { id: "confirm-delete" },
		});
	});

	// #248: an alert auto-sizes ([0, 0] handed to ClassicyWindow) and centers
	// against that phantom box at mount. Async content growth -- an <img> in
	// the message finishing load -- must re-run centering against the real,
	// current size and re-clamp to the viewport, not leave the box pinned
	// near the pre-image midpoint.
	describe("re-centers when the message grows after mount (#248)", () => {
		// jsdom has no ResizeObserver; this captures the callback ClassicyWindow
		// registers so the test can invoke it manually once the image "loads" --
		// the standard workaround given jsdom can't itself report a layout change.
		class MockResizeObserver {
			static instances: MockResizeObserver[] = [];
			callback: () => void;
			constructor(callback: () => void) {
				this.callback = callback;
				MockResizeObserver.instances.push(this);
			}
			observe = vi.fn();
			unobserve = vi.fn();
			disconnect = vi.fn();
		}

		const originalWidth = window.innerWidth;
		const originalHeight = window.innerHeight;

		beforeEach(() => {
			MockResizeObserver.instances = [];
			vi.stubGlobal("ResizeObserver", MockResizeObserver);
			Object.defineProperty(window, "innerWidth", {
				configurable: true,
				value: 1000,
			});
			Object.defineProperty(window, "innerHeight", {
				configurable: true,
				value: 800,
			});
		});

		afterEach(() => {
			vi.unstubAllGlobals();
			Object.defineProperty(window, "innerWidth", {
				configurable: true,
				value: originalWidth,
			});
			Object.defineProperty(window, "innerHeight", {
				configurable: true,
				value: originalHeight,
			});
		});

		it("dispatches a re-centered, re-clamped position once the image finishes loading", () => {
			render(
				<ClassicyAlert
					id="img-alert"
					appId="Finder.app"
					alertType="note"
					label="Loading"
					message={<img src="pic.png" alt="pic" />}
				/>,
			);

			expect(MockResizeObserver.instances).toHaveLength(1);

			// The alert's window id is `${appId}_${id}`; getElementById sidesteps
			// escaping the "." in "Finder.app" for a CSS selector.
			const windowEl = document.getElementById(
				"Finder.app_img-alert",
			) as HTMLElement;
			expect(windowEl).toBeTruthy();

			const img = screen.getByAltText("pic");
			fireEvent.load(img);

			// Simulate the box having actually grown to a real measured size (in
			// place of the [0, 0] it was centered against at mount) -- what a real
			// browser's ResizeObserver would report once the image lays out.
			vi.spyOn(windowEl, "getBoundingClientRect").mockReturnValue({
				width: 500,
				height: 400,
				top: 0,
				left: 0,
				right: 500,
				bottom: 400,
				x: 0,
				y: 0,
				toJSON: () => ({}),
			} as DOMRect);

			mockDispatch.mockClear();
			MockResizeObserver.instances[0].callback();

			const moves = mockDispatch.mock.calls
				.map(
					(call) =>
						call[0] as {
							type: string;
							moving?: boolean;
							position?: [number, number];
						},
				)
				.filter((action) => action.type === "ClassicyWindowMove");
			expect(moves).toHaveLength(1);

			const expected = clampWindowPositionToViewport(
				resolvePosition(["center", "center"], [500, 400]),
				[500, 400],
			);
			expect(moves[0]?.position).toEqual(expected);
		});
	});
});
