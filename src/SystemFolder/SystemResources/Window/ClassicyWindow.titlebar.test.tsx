import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());
const mockWindowState = vi.hoisted(() => ({ collapsed: false }));

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
											collapsed: mockWindowState.collapsed,
											focused: false,
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
		useClassicyAnalytics: () => ({ track: vi.fn() }),
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

function renderWindow(
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) {
	const result = render(
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test" {...props}>
			<p>content</p>
		</ClassicyWindow>,
	);
	const titleBar = result.container.querySelector(
		".classicyWindowTitle",
	) as HTMLElement;
	return { ...result, titleBar };
}

const dispatchedTypes = () =>
	mockDispatch.mock.calls.map((call) => call[0] as { type: string });

const dragStartEvents = () =>
	dispatchedTypes().filter(
		(e: { type: string; dragging?: boolean; moving?: boolean }) =>
			(e.type === "ClassicyWindowDrag" && e.dragging === true) ||
			(e.type === "ClassicyWindowMove" && e.moving === true),
	);

describe("ClassicyWindow title bar", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		mockWindowState.collapsed = false;
	});

	it("does not start a drag on a bare click", () => {
		const { titleBar } = renderWindow();
		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseUp(titleBar, { clientX: 150, clientY: 120 });
		expect(dragStartEvents()).toHaveLength(0);
		expect(mockPlayer).not.toHaveBeenCalledWith(
			expect.objectContaining({ sound: "ClassicyWindowMoveIdle" }),
		);
	});

	it("does not start a drag when movement stays under the threshold", () => {
		const { titleBar } = renderWindow();
		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 152, clientY: 121 });
		fireEvent.mouseUp(document.body, { clientX: 152, clientY: 121 });
		expect(dragStartEvents()).toHaveLength(0);
	});

	it("starts a drag once movement exceeds the threshold", () => {
		const { titleBar } = renderWindow();
		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 160, clientY: 130 });
		expect(dragStartEvents().length).toBeGreaterThan(0);
		expect(mockPlayer).toHaveBeenCalledWith(
			expect.objectContaining({ sound: "ClassicyWindowMoveIdle" }),
		);
		// The promotion event must carry the pointer-derived position so a
		// drag delivered in a single fast mousemove is not lost (jsdom rects
		// are all zeros, so the offset equals the mousedown coordinates).
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({
				type: "ClassicyWindowMove",
				moving: true,
				position: [10, 10],
			}),
		);
	});

	it("does not start a drag on movement after the button is released", () => {
		const { titleBar } = renderWindow();
		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseUp(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 200, clientY: 200 });
		expect(dragStartEvents()).toHaveLength(0);
	});

	it("collapses the window on double-click", () => {
		const { titleBar } = renderWindow();
		fireEvent.dblClick(titleBar);
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowCollapse" }),
		);
	});

	it("expands a collapsed window on double-click", () => {
		mockWindowState.collapsed = true;
		const { titleBar } = renderWindow();
		fireEvent.dblClick(titleBar);
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowExpand" }),
		);
	});

	it("ignores double-click when the window is not collapsable", () => {
		const { titleBar } = renderWindow({ collapsable: false });
		fireEvent.dblClick(titleBar);
		const collapseEvents = dispatchedTypes().filter(
			(e) =>
				e.type === "ClassicyWindowCollapse" ||
				e.type === "ClassicyWindowExpand",
		);
		expect(collapseEvents).toHaveLength(0);
	});
});
