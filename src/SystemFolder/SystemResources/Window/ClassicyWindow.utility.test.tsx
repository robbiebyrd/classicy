import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// The persisted window record is unfocused (focused: false) — the state a tool
// palette is in whenever the user is working in the main document window.
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

function renderWindow(
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) {
	return render(
		<ClassicyWindow
			id="TestWindow"
			appId="TestApp"
			title="Test"
			placard={<span>100%</span>}
			resizable
			{...props}
		>
			<p>content</p>
		</ClassicyWindow>,
	);
}

describe("ClassicyWindow utility (floating) windows never dim when unfocused", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// A tool palette floats: even while the document window owns focus, the
	// palette shows its active chrome rather than the washed-out inactive filter.
	it("renders a utility window as active even when unfocused", () => {
		const { container } = renderWindow({ windowType: "utility" });
		const win = container.querySelector(".classicyWindowUtility");
		expect(win).not.toBeNull();
		expect(win?.classList.contains("classicyWindowActive")).toBe(true);
		expect(win?.classList.contains("classicyWindowInactive")).toBe(false);
	});

	// None of the per-region dimming treatments apply to a floating palette.
	it("does not dim the placard or resizer of an unfocused utility window", () => {
		const { container } = renderWindow({ windowType: "utility" });
		expect(
			container.querySelector(".classicyWindowPlacardBarDimmed"),
		).toBeNull();
		expect(container.querySelector(".classicyWindowResizerDimmed")).toBeNull();
	});

	// Regression guard: an ordinary document window still dims when unfocused.
	it("still dims an unfocused document window", () => {
		const { container } = renderWindow({ windowType: "document" });
		const win = container.querySelector(".classicyWindowDocument");
		expect(win).not.toBeNull();
		expect(win?.classList.contains("classicyWindowInactive")).toBe(true);
		expect(win?.classList.contains("classicyWindowActive")).toBe(false);
		expect(
			container.querySelector(".classicyWindowPlacardBarDimmed"),
		).not.toBeNull();
	});
});

describe("ClassicyWindow utility windows have no title text and no icon", () => {
	// A windoid's title bar is pure crosshatch + controls: even when the
	// consumer passes a title, it is never painted in the bar.
	it("renders no title text even when a title prop is provided", () => {
		const { container } = renderWindow({
			windowType: "utility",
			title: "Tools",
		});
		expect(container.querySelector(".classicyWindowTitleText")).toBeNull();
	});

	// No document icon in a utility title bar, even with hideIcon defaulted off.
	it("renders no icon even when hideIcon is false", () => {
		const { container } = renderWindow({
			windowType: "utility",
			title: "Tools",
			hideIcon: false,
		});
		expect(container.querySelector(".classicyWindowIcon")).toBeNull();
	});

	// The empty crosshatch center is what the utility bar shows instead.
	it("renders the empty crosshatch center region", () => {
		const { container } = renderWindow({
			windowType: "utility",
			title: "Tools",
		});
		expect(
			container.querySelector(".classicyWindowTitleCenter"),
		).not.toBeNull();
	});

	// Regression: a document window with a title still paints the title text.
	it("still renders title text for a document window with a title", () => {
		const { container } = renderWindow({
			windowType: "document",
			title: "Tools",
		});
		expect(container.querySelector(".classicyWindowTitleText")).not.toBeNull();
	});
});
