import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";
import type { ClassicyMenuItem } from "@/SystemFolder/SystemResources/Menu/ClassicyMenu";
import { ClassicyWindow } from "@/SystemFolder/SystemResources/Window/ClassicyWindow";

const mockDispatch = vi.hoisted(() => vi.fn());
const mockPlayer = vi.hoisted(() => vi.fn());
const mockAppState = vi.hoisted(
	() =>
		({ contextMenu: undefined }) as {
			contextMenu?: { id: string; title?: string }[];
		},
);

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Applications: {
							apps: {
								"Test.app": {
									id: "Test.app",
									focused: true,
									contextMenu: mockAppState.contextMenu,
									windows: [
										{
											id: "test_window",
											appId: "Test.app",
											collapsed: false,
											focused: true,
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

const windowMenu: ClassicyMenuItem[] = [{ id: "w1", title: "Window Item" }];
const appMenu: ClassicyMenuItem[] = [{ id: "a1", title: "App Item" }];

const renderWindow = (
	props: Partial<Parameters<typeof ClassicyWindow>[0]> = {},
) =>
	render(
		<ClassicyContextualMenuProvider>
			<ClassicyWindow id="test_window" appId="Test.app" {...props}>
				<span>window content</span>
			</ClassicyWindow>
		</ClassicyContextualMenuProvider>,
	);

describe("ClassicyWindow contextual menu resolution", () => {
	beforeEach(() => {
		mockDispatch.mockClear();
		mockAppState.contextMenu = undefined;
	});

	it("shows the window-level menu from the contextMenu prop", () => {
		renderWindow({ contextMenu: windowMenu });
		fireEvent.contextMenu(screen.getByText("window content"));
		expect(screen.getByText("Window Item")).toBeInTheDocument();
	});

	it("window prop wins over the app-level menu", () => {
		mockAppState.contextMenu = appMenu;
		renderWindow({ contextMenu: windowMenu });
		fireEvent.contextMenu(screen.getByText("window content"));
		expect(screen.getByText("Window Item")).toBeInTheDocument();
		expect(screen.queryByText("App Item")).not.toBeInTheDocument();
	});

	it("falls back to the app-level menu when the window has none", () => {
		mockAppState.contextMenu = appMenu;
		renderWindow();
		fireEvent.contextMenu(screen.getByText("window content"));
		expect(screen.getByText("App Item")).toBeInTheDocument();
	});

	it("shows nothing when neither window nor app defines a menu, but still claims the event", () => {
		const outerHandler = vi.fn();
		render(
			<ClassicyContextualMenuProvider>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
				<div onContextMenu={outerHandler}>
					<ClassicyWindow id="test_window" appId="Test.app">
						<span>window content</span>
					</ClassicyWindow>
				</div>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("window content"));
		expect(outerHandler).not.toHaveBeenCalled();
		expect(
			document.querySelector(".classicyContextMenuWrapper"),
		).not.toBeInTheDocument();
	});

	it("does nothing when a child already claimed the event via preventDefault", () => {
		render(
			<ClassicyContextualMenuProvider>
				<ClassicyWindow
					id="test_window"
					appId="Test.app"
					contextMenu={windowMenu}
				>
					{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
					<span
						onContextMenu={(e) => {
							e.preventDefault();
						}}
					>
						opt-out child
					</span>
				</ClassicyWindow>
			</ClassicyContextualMenuProvider>,
		);
		fireEvent.contextMenu(screen.getByText("opt-out child"));
		expect(screen.queryByText("Window Item")).not.toBeInTheDocument();
		expect(
			document.querySelector(".classicyContextMenuWrapper"),
		).not.toBeInTheDocument();
	});
});
