import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@/__tests__/test-utils";
import { ClassicyContextualMenuProvider } from "@/SystemFolder/SystemResources/ContextualMenu/ClassicyContextualMenuProvider";

const mockDispatch = vi.hoisted(() => vi.fn());

vi.mock(
	"@/SystemFolder/ControlPanels/AppManager/ClassicyAppManagerUtils",
	() => ({
		useAppManager: (selector: (state: unknown) => unknown) => {
			const mockState = {
				System: {
					Manager: {
						Desktop: {
							selectedIcons: [] as string[],
							icons: [{ appId: "TestApp", location: [100, 200] }],
						},
						Applications: {
							apps: {
								"Finder.app": { windows: [] as unknown[] },
								TestApp: { open: false },
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
	"@/SystemFolder/SystemResources/Analytics/useClassicyAnalytics",
	() => ({
		useClassicyAnalytics: () => ({ track: vi.fn() }),
	}),
);

vi.mock(
	"@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon.scss",
	() => ({}),
);

import { ClassicyDesktopIcon } from "@/SystemFolder/SystemResources/Desktop/ClassicyDesktopIcon";

const defaultProps = {
	appId: "TestApp",
	appName: "Test Application",
	icon: "/icons/test.png",
	kind: "app_shortcut",
};

describe("ClassicyDesktopIcon", () => {
	it("renders icon image with alt text matching appName", () => {
		render(<ClassicyDesktopIcon {...defaultProps} />);
		expect(screen.getByAltText("Test Application")).toBeInTheDocument();
	});

	it("renders appName as label when no label prop is provided", () => {
		render(<ClassicyDesktopIcon {...defaultProps} />);
		expect(screen.getByText("Test Application")).toBeInTheDocument();
	});

	it("renders label text instead of appName when label is provided", () => {
		render(<ClassicyDesktopIcon {...defaultProps} label="My Custom Label" />);
		expect(screen.getByText("My Custom Label")).toBeInTheDocument();
		expect(screen.queryByText("Test Application")).not.toBeInTheDocument();
	});

	it("renders a div with the correct id", () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const div = container.querySelector("#TestApp\\.shortcut");
		expect(div).toBeInTheDocument();
	});

	it("calls dispatch with ClassicyDesktopIconFocus on single click", async () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const iconDiv = container.querySelector(
			"#TestApp\\.shortcut",
		) as HTMLElement;
		mockDispatch.mockClear();
		iconDiv.click();
		expect(mockDispatch).toHaveBeenCalledWith({
			type: "ClassicyDesktopIconFocus",
			iconId: "TestApp",
		});
	});

	it("calls dispatch with ClassicyDesktopIconOpen on double-click", async () => {
		const { container } = render(<ClassicyDesktopIcon {...defaultProps} />);
		const iconDiv = container.querySelector(
			"#TestApp\\.shortcut",
		) as HTMLElement;
		mockDispatch.mockClear();
		const dblClickEvent = new MouseEvent("dblclick", { bubbles: true });
		iconDiv.dispatchEvent(dblClickEvent);
		expect(mockDispatch).toHaveBeenCalledWith(
			expect.objectContaining({
				type: "ClassicyDesktopIconOpen",
				iconId: "TestApp.shortcut",
				app: {
					id: "TestApp",
					name: "Test Application",
					icon: "/icons/test.png",
				},
			}),
		);
	});
});

describe("ClassicyDesktopIcon contextual menu", () => {
	const iconMenu = [{ id: "open", title: "Open Item" }];

	it("shows its per-icon menu on right-click and selects the icon", () => {
		const { container } = render(
			<ClassicyContextualMenuProvider>
				<ClassicyDesktopIcon {...defaultProps} contextMenu={iconMenu} />
			</ClassicyContextualMenuProvider>,
		);
		const iconDiv = container.querySelector(
			"#TestApp\\.shortcut",
		) as HTMLElement;
		mockDispatch.mockClear();
		fireEvent.contextMenu(iconDiv);
		expect(screen.getByText("Open Item")).toBeInTheDocument();
		expect(mockDispatch).toHaveBeenCalledWith({
			type: "ClassicyDesktopIconFocus",
			iconId: "TestApp",
		});
	});

	it("shows nothing on right-click when no menu is defined, but still claims the event", () => {
		const outerHandler = vi.fn();
		const { container } = render(
			<ClassicyContextualMenuProvider>
				{/* biome-ignore lint/a11y/noStaticElementInteractions: test harness */}
				<div onContextMenu={outerHandler}>
					<ClassicyDesktopIcon {...defaultProps} />
				</div>
			</ClassicyContextualMenuProvider>,
		);
		const iconDiv = container.querySelector(
			"#TestApp\\.shortcut",
		) as HTMLElement;
		fireEvent.contextMenu(iconDiv);
		expect(outerHandler).not.toHaveBeenCalled();
		expect(
			document.querySelector(".classicyContextMenuWrapper"),
		).not.toBeInTheDocument();
	});
});
