import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

// The persisted window record is unfocused (focused: false) — the state a tool
// palette is in whenever the user is working in the main document window.
const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());
// Lets individual tests flip the owning app's focus state, which drives the
// utility window's z-index band (floating vs backgrounded).
const mockAppFocused = vi.hoisted(() => ({ value: false }));

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
									focused: mockAppFocused.value,
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

describe("ClassicyWindow utility windows expose title as accessible name", () => {
	// The windoid paints no title, but the title prop must still name the
	// window for assistive tech.
	it("sets aria-label from the title prop on a utility window", () => {
		const { container } = renderWindow({
			windowType: "utility",
			title: "Tools",
		});
		const root = container.querySelector('[role="application"]');
		expect(root?.getAttribute("aria-label")).toBe("Tools");
	});
});

describe("ClassicyWindow utility windows layer relative to app focus", () => {
	beforeEach(() => {
		mockAppFocused.value = false;
	});

	// When the palette's own app is focused, it floats above that app's
	// document windows.
	it("adds classicyWindowFloating when the owning app is focused", () => {
		mockAppFocused.value = true;
		const { container } = renderWindow({ windowType: "utility" });
		const win = container.querySelector(".classicyWindowUtility");
		expect(win?.classList.contains("classicyWindowFloating")).toBe(true);
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(false);
	});

	// When the palette's own app is backgrounded, it drops behind the focused
	// app's windows (e.g. a Finder browser window).
	it("adds classicyWindowBackgrounded when the owning app is not focused", () => {
		mockAppFocused.value = false;
		const { container } = renderWindow({ windowType: "utility" });
		const win = container.querySelector(".classicyWindowUtility");
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(true);
		expect(win?.classList.contains("classicyWindowFloating")).toBe(false);
	});

	// Document windows never get either layering class.
	it("adds neither layering class to a document window", () => {
		mockAppFocused.value = true;
		const { container } = renderWindow({ windowType: "document" });
		const win = container.querySelector(".classicyWindowDocument");
		expect(win?.classList.contains("classicyWindowFloating")).toBe(false);
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(false);
	});
});

describe("ClassicyWindow utility windows with alwaysOnTop float above all apps", () => {
	beforeEach(() => {
		mockAppFocused.value = false;
	});

	// The whole point of the feature: a backgrounded app's palette stays in the
	// floating band instead of dropping behind the focused app.
	it("stays classicyWindowFloating when the owning app is NOT focused", () => {
		mockAppFocused.value = false;
		const { container } = renderWindow({
			windowType: "utility",
			alwaysOnTop: true,
		});
		const win = container.querySelector(".classicyWindowUtility");
		expect(win?.classList.contains("classicyWindowFloating")).toBe(true);
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(false);
	});

	// When the app IS focused it also floats (same band as the #234 default).
	it("is classicyWindowFloating when the owning app is focused", () => {
		mockAppFocused.value = true;
		const { container } = renderWindow({
			windowType: "utility",
			alwaysOnTop: true,
		});
		const win = container.querySelector(".classicyWindowUtility");
		expect(win?.classList.contains("classicyWindowFloating")).toBe(true);
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(false);
	});

	// alwaysOnTop is a no-op on document windows — they never get a layering class.
	it("adds neither layering class to a document window even with alwaysOnTop", () => {
		mockAppFocused.value = false;
		const { container } = renderWindow({
			windowType: "document",
			alwaysOnTop: true,
		});
		const win = container.querySelector(".classicyWindowDocument");
		expect(win?.classList.contains("classicyWindowFloating")).toBe(false);
		expect(win?.classList.contains("classicyWindowBackgrounded")).toBe(false);
	});
});
