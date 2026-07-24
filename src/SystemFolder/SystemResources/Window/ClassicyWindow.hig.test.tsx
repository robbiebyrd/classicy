import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());

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
											collapsed: false,
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

const dispatchedTypes = () =>
	mockDispatch.mock.calls.map((call) => call[0] as { type: string });

function renderWindow(
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) {
	return render(
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test" {...props}>
			<p>content</p>
		</ClassicyWindow>,
	);
}

describe("ClassicyWindow HIG dialog behaviors", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// #197: a modal window hides the zoom box even when zoomable.
	it("hides the zoom box on a modal window", () => {
		const { container } = renderWindow({ modal: true, zoomable: true });
		expect(
			container.querySelector(".classicyWindowZoomBox") ??
				document.querySelector(".classicyWindowZoomBox"),
		).toBeNull();
	});

	// #197: Escape dismisses a closable modal (the Cancel keyboard equivalent).
	it("closes a modal on Escape", () => {
		renderWindow({ modal: true, closable: true });
		const win = document.querySelector(".classicyWindow") as HTMLElement;
		fireEvent.keyDown(win, { key: "Escape" });
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowClose" }),
		);
	});

	// #197: clicking the scrim outside a modal beeps and does not close it.
	it("beeps on an outside (scrim) click of a modal", () => {
		renderWindow({ modal: true, closable: true });
		const scrim = document.querySelector(
			".classicyWindowModalScrim",
		) as HTMLElement;
		expect(scrim).not.toBeNull();
		fireEvent.mouseDown(scrim);
		expect(mockPlayer).toHaveBeenCalledWith(
			expect.objectContaining({ type: "ClassicySoundPlayError" }),
		);
		expect(dispatchedTypes()).not.toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowClose" }),
		);
	});

	// #205: a fixed (error) modal cannot be dragged from the title bar.
	it("does not drag a fixed error modal", () => {
		renderWindow({ modal: true, type: "error" });
		const title = document.querySelector(".classicyWindowTitle") as HTMLElement;
		fireEvent.mouseDown(title, { clientX: 150, clientY: 120 });
		fireEvent.mouseMove(document.body, { clientX: 200, clientY: 200 });
		const dragStarts = dispatchedTypes().filter(
			(e: { type: string; moving?: boolean }) =>
				e.type === "ClassicyWindowMove" &&
				(e as { moving?: boolean }).moving === true,
		);
		expect(dragStarts).toHaveLength(0);
	});

	// A non-error modal (e.g. a File Open/Save dialog) must sit in the
	// modal-front stacking band so it renders ABOVE utility/tool palettes
	// (.classicyWindowFloating) rather than being covered by them.
	it("puts a non-error modal in the modal-front band (above utility palettes)", () => {
		renderWindow({ modal: true });
		const win = document.querySelector(".classicyWindowModal");
		expect(win).not.toBeNull();
		expect(win?.classList.contains("classicyWindowModalFront")).toBe(true);
		expect(win?.classList.contains("classicyWindowRed")).toBe(false);
	});

	// An error alert modal stays in the red alert band (top of the stack), NOT
	// the modal-front band — so alerts still appear over File dialogs.
	it("keeps an error alert modal out of the modal-front band", () => {
		renderWindow({ modal: true, type: "error" });
		const win = document.querySelector(".classicyWindowModal");
		expect(win).not.toBeNull();
		expect(win?.classList.contains("classicyWindowRed")).toBe(true);
		expect(win?.classList.contains("classicyWindowModalFront")).toBe(false);
	});

	// #208: zooming a full-mode window moves it to the standard-state origin and
	// flags it zoomed.
	it("zooms to the standard-state rect on a zoom-box click", () => {
		const { container } = renderWindow({ zoomable: true });
		const zoomBox = container.querySelector(
			".classicyWindowZoomBox",
		) as HTMLElement;
		fireEvent.click(zoomBox);
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({ type: "ClassicyWindowZoom", zoomed: true }),
		);
		expect(dispatchedTypes()).toContainEqual(
			expect.objectContaining({
				type: "ClassicyWindowMove",
				position: [8, 38],
			}),
		);
	});

	// #205: renders four draggable frame-edge handles on an expanded window.
	it("renders draggable frame edges on all four sides", () => {
		const { container } = renderWindow();
		expect(container.querySelectorAll(".classicyWindowFrameEdge")).toHaveLength(
			4,
		);
	});

	// #203: the content frame carries active/inactive styling.
	it("applies the content frame class when contentFrame is set", () => {
		const { container } = renderWindow({ contentFrame: true });
		expect(
			container.querySelector(".classicyWindowContentsFramed"),
		).not.toBeNull();
	});

	// #183: the list header variant is applied to the header region.
	it("applies the list header variant class", () => {
		const { container } = renderWindow({
			headerVariant: "list",
			header: <span>Columns</span>,
		});
		expect(container.querySelector(".classicyWindowHeaderList")).not.toBeNull();
	});
});
