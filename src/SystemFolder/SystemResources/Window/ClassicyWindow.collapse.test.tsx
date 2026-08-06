import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockPlayer = vi.hoisted(() => vi.fn());

// Stands in for the store slice ClassicyWindowResize/Collapse/Expand mutate
// (see ClassicyAppManager.ts) — `size`/`collapsed` mirror what the real
// reducer would write on each dispatched action, so a test can assert the
// value that would ultimately be persisted to localStorage, not just that a
// dispatch call happened.
const mockWindowState = vi.hoisted(() => ({
	collapsed: false,
	size: [350, 200] as [number, number],
}));

const mockDispatch = vi.hoisted(() =>
	vi.fn((action: { type: string; size?: [number, number] }) => {
		if (action.type === "ClassicyWindowResize" && action.size) {
			mockWindowState.size = action.size;
		}
		if (action.type === "ClassicyWindowCollapse") {
			mockWindowState.collapsed = true;
		}
		if (action.type === "ClassicyWindowExpand") {
			mockWindowState.collapsed = false;
		}
	}),
);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Desktop: { doubleClickTitleToCollapse: true },
						Applications: {
							apps: {
								TestApp: {
									id: "TestApp",
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
											size: mockWindowState.size,
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

function windowEl() {
	return (
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test">
			<p>content</p>
		</ClassicyWindow>
	);
}

const resizeDispatches = () =>
	mockDispatch.mock.calls
		.map((call) => call[0] as { type: string; size?: [number, number] })
		.filter((action) => action.type === "ClassicyWindowResize");

describe("ClassicyWindow collapsed-size persistence (#11)", () => {
	// Tracked separately from mockDispatch/mockPlayer (plain vi.fn() mocks with
	// a custom body, not spies) so afterEach only restores this real spy —
	// vi.restoreAllMocks() would also wipe mockDispatch's inline implementation
	// down to a no-op, since it was constructed via vi.fn(impl) rather than
	// vi.spyOn().
	let rectSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
		mockWindowState.collapsed = false;
		mockWindowState.size = [350, 200];

		// jsdom never runs layout, so getBoundingClientRect() is always zeros
		// by default. In a real browser, ClassicyWindow.scss's
		// `.classicyWindowCollapsed { height: ... !important }` forces the
		// window's rect height to the ~24px title bar while collapsed. Stand
		// that in here — driven off the same class the component applies —
		// so the rect read at mouseup behaves exactly like a real browser.
		// When a resize drag is in flight the component writes the live size
		// directly to the element's inline style, so honor that too.
		rectSpy = vi
			.spyOn(Element.prototype, "getBoundingClientRect")
			.mockImplementation(function (this: HTMLElement) {
				const collapsed = this.classList.contains("classicyWindowCollapsed");
				const inlineHeight = parseFloat(this.style.height || "");
				const inlineWidth = parseFloat(this.style.width || "");
				const height = collapsed
					? 24
					: !Number.isNaN(inlineHeight)
						? inlineHeight
						: 200;
				const width = !Number.isNaN(inlineWidth) ? inlineWidth : 350;
				return {
					width,
					height,
					top: 110,
					left: 110,
					right: 110 + width,
					bottom: 110 + height,
					x: 110,
					y: 110,
					toJSON: () => {},
				} as DOMRect;
			});
	});

	afterEach(() => {
		rectSpy.mockRestore();
	});

	it("does not dispatch a resize whose height is the collapsed title-bar height on mouse release", () => {
		mockWindowState.collapsed = true;
		const { container, rerender } = render(windowEl());
		rerender(windowEl());

		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(root.classList.contains("classicyWindowCollapsed")).toBe(true);

		fireEvent.mouseUp(root);

		expect(resizeDispatches()).toHaveLength(0);
	});

	it("survives a collapse -> click -> expand cycle with the pre-collapse size intact", () => {
		const { container, rerender } = render(windowEl());

		// Collapse (mirrors a collapse-box click dispatching ClassicyWindowCollapse).
		mockWindowState.collapsed = true;
		rerender(windowEl());

		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(root.classList.contains("classicyWindowCollapsed")).toBe(true);

		// The reported bug path: a bare click on the collapsed window — mousedown
		// and mouseup on the title bar with no movement, driving stopChangeWindow.
		const titleBar = container.querySelector(
			".classicyWindowTitle",
		) as HTMLElement;
		fireEvent.mouseDown(titleBar, { clientX: 150, clientY: 120 });
		fireEvent.mouseUp(titleBar, { clientX: 150, clientY: 120 });

		// Expand (mirrors ClassicyWindowExpand landing in the store).
		mockWindowState.collapsed = false;
		rerender(windowEl());

		// The size that would be persisted to localStorage is the pre-collapse
		// size — not the ~24px collapsed title-bar height the click's mouseup
		// would have measured off a real (uncapped) rect read.
		expect(mockWindowState.size).toEqual([350, 200]);
		expect(resizeDispatches()).toHaveLength(0);
	});

	it("still persists a new height when resizing an expanded (non-collapsed) window", () => {
		const { container } = render(windowEl());
		const root = container.querySelector(".classicyWindow") as HTMLElement;
		expect(root.classList.contains("classicyWindowCollapsed")).toBe(false);

		// Simulate a completed resize drag: the component writes the live
		// dimensions to the root's inline style during a drag (see
		// docMoveHandlerRef), then reads them back via getBoundingClientRect()
		// on release.
		root.style.width = "400px";
		root.style.height = "260px";

		fireEvent.mouseUp(root);

		const dispatches = resizeDispatches();
		expect(dispatches.length).toBeGreaterThan(0);
		expect(dispatches[dispatches.length - 1]?.size).toEqual([400, 260]);
		expect(mockWindowState.size).toEqual([400, 260]);
	});
});
