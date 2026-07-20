import { beforeEach, describe, expect, it, vi } from "vitest";
import { render } from "@/__tests__/test-utils";
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

function renderWindow(
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) {
	return render(
		<ClassicyWindow id="TestWindow" appId="TestApp" title="Test" {...props}>
			<p>content</p>
		</ClassicyWindow>,
	);
}

function contentsOf(container: HTMLElement): HTMLElement {
	const el = container.querySelector(
		".classicyWindowContents, .classicyWindowContentsModal",
	);
	expect(el).not.toBeNull();
	return el as HTMLElement;
}

describe("ClassicyWindow backgroundColor prop", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockPlayer.mockClear();
	});

	// Backward compatible: without the prop, the theme default applies and no
	// inline variable is set.
	it("sets no inline variable when the prop is omitted", () => {
		const { container } = renderWindow();
		const contents = contentsOf(container);
		expect(
			contents.style.getPropertyValue("--classicy-window-contents-bg"),
		).toBe("");
	});

	it("forwards a hex color to the contents div", () => {
		const { container } = renderWindow({ backgroundColor: "#ff0000" });
		expect(
			contentsOf(container).style.getPropertyValue(
				"--classicy-window-contents-bg",
			),
		).toBe("#ff0000");
	});

	it("forwards an rgba() color", () => {
		const { container } = renderWindow({
			backgroundColor: "rgba(0, 0, 0, 0.5)",
		});
		expect(
			contentsOf(container).style.getPropertyValue(
				"--classicy-window-contents-bg",
			),
		).toBe("rgba(0, 0, 0, 0.5)");
	});

	it("forwards a CSS variable reference", () => {
		const { container } = renderWindow({
			backgroundColor: "var(--color-system-01)",
		});
		expect(
			contentsOf(container).style.getPropertyValue(
				"--classicy-window-contents-bg",
			),
		).toBe("var(--color-system-01)");
	});

	// Modal windows use .classicyWindowContentsModal with an !important
	// background; the variable must land on that div too. Modals render via
	// createPortal into document.body in jsdom, so query the body, not the
	// render container.
	it("applies the variable to a modal window's contents div", () => {
		renderWindow({
			modal: true,
			backgroundColor: "#00ff00",
		});
		const modalContents = document.body.querySelector(
			".classicyWindowContentsModal",
		) as HTMLElement;
		expect(modalContents).not.toBeNull();
		expect(
			modalContents.style.getPropertyValue("--classicy-window-contents-bg"),
		).toBe("#00ff00");
	});
});
