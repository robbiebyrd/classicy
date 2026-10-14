import { type ReactNode, useRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());
// The store's view of TestWindow, mutable per test so a rerender can model the
// focused flag flipping (the mocked useAppManager re-reads it on every call).
const mockWindow = vi.hoisted(() => ({ focused: false, collapsed: false }));

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Applications: {
							apps: {
								TestApp: {
									focused: false,
									windows: [
										{
											id: "TestWindow",
											appId: "TestApp",
											collapsed: mockWindow.collapsed,
											focused: mockWindow.focused,
											dragging: false,
											moving: false,
											resizing: false,
											zoomed: false,
											closed: false,
											size: [350, 200] as [number, number],
											position: [110, 110] as [number, number],
											minimumSize: [0, 0] as [number, number],
											menuBar: [] as unknown[],
											default: false,
										},
									],
								},
							},
						},
					},
				},
			};
			return selector(mockState);
		},
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

vi.mock(
	"@/SystemFolder/SystemResources/Window/ClassicyWindow.scss",
	() => ({}),
);

describe("ClassicyWindow mount", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		mockWindow.focused = false;
		mockWindow.collapsed = false;
	});

	it("registers via ClassicyWindowOpen but never dispatches ClassicyWindowFocus on mount", () => {
		render(
			<ClassicyWindow
				id="TestWindow"
				appId="TestApp"
				title="Test"
				appMenu={[{ id: "file", title: "File" }]}
			>
				<p>content</p>
			</ClassicyWindow>,
		);

		const types = mockDispatch.mock.calls.map(
			(call) => (call[0] as { type: string }).type,
		);
		expect(types).toContain("ClassicyWindowOpen");
		expect(types).not.toContain("ClassicyWindowFocus");
	});
});

// A window whose list box stand-in is its initialFocusRef target, plus an
// input standing in for "something the user clicked inside the window".
const FocusHarness = ({
	modal = false,
	children,
}: {
	modal?: boolean;
	children?: ReactNode;
}) => {
	const targetRef = useRef<HTMLDivElement | null>(null);
	return (
		<ClassicyWindow
			id="TestWindow"
			appId="TestApp"
			title="Test"
			modal={modal}
			initialFocusRef={targetRef}
		>
			<input aria-label="Name" />
			<div
				ref={targetRef}
				role="listbox"
				tabIndex={0}
				aria-label="List"
				data-testid="target"
			/>
			{children}
		</ClassicyWindow>
	);
};

describe("ClassicyWindow initialFocusRef (#270)", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		mockWindow.focused = false;
		mockWindow.collapsed = false;
		(document.activeElement as HTMLElement | null)?.blur?.();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("focuses the target when the window mounts already focused, without dispatching ClassicyWindowFocus", () => {
		mockWindow.focused = true;
		render(<FocusHarness />);

		expect(document.activeElement).toBe(screen.getByTestId("target"));
		const types = mockDispatch.mock.calls.map(
			(call) => (call[0] as { type: string }).type,
		);
		expect(types).not.toContain("ClassicyWindowFocus");
	});

	it("leaves an unfocused window's target alone (restored background windows)", () => {
		render(<FocusHarness />);

		expect(document.activeElement).not.toBe(screen.getByTestId("target"));
	});

	it("moves focus to the target when the window becomes focused", () => {
		const { rerender } = render(<FocusHarness />);
		expect(document.activeElement).not.toBe(screen.getByTestId("target"));

		mockWindow.focused = true;
		rerender(<FocusHarness />);

		expect(document.activeElement).toBe(screen.getByTestId("target"));
	});

	it("only reacts to the transition: re-rendering a focused window does not steal focus back", () => {
		mockWindow.focused = true;
		const { rerender } = render(<FocusHarness />);
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		outside.focus();

		rerender(<FocusHarness />);

		expect(document.activeElement).toBe(outside);
		outside.remove();
	});

	it("keeps focus on an input inside the window that already has it", () => {
		const { rerender } = render(<FocusHarness />);
		const input = screen.getByLabelText("Name");
		input.focus();

		mockWindow.focused = true;
		rerender(<FocusHarness />);

		expect(document.activeElement).toBe(input);
	});

	it("does not focus the target of a collapsed window", () => {
		mockWindow.collapsed = true;
		mockWindow.focused = true;
		render(<FocusHarness />);

		expect(document.activeElement).not.toBe(screen.getByTestId("target"));
	});

	it("re-focuses the target on a title-bar press in the already-focused window", () => {
		mockWindow.focused = true;
		const { container } = render(<FocusHarness />);
		(document.activeElement as HTMLElement).blur();
		expect(document.activeElement).toBe(document.body);

		const title = container.querySelector(".classicyWindowTitle") as Element;
		fireEvent.mouseDown(title);

		expect(document.activeElement).toBe(screen.getByTestId("target"));
	});

	it("leaves a modal's initial focus to its focus trap (focused once, not twice)", () => {
		mockWindow.focused = true;
		const focusSpy = vi.spyOn(HTMLElement.prototype, "focus");
		render(<FocusHarness modal />);
		const target = screen.getByTestId("target");

		expect(document.activeElement).toBe(target);
		expect(
			focusSpy.mock.contexts.filter((context) => context === target),
		).toHaveLength(1);
	});
});
